import { db } from './db';
import { sendSMS } from './twilio';
import { generateVenmoLink, generatePaymentNote } from './venmo';
import { parseSMSResponse, generateClarificationMessage } from './sms-parser';
import { addDays, format } from 'date-fns';
import { formatTime } from './utils';

/**
 * Create a new game instance and send confirmation texts to regulars
 */
export async function createGameInstanceAndSendConfirmations(gameId: string, date: Date) {
  // Create game instance
  const gameInstance = await db.gameInstance.create({
    data: {
      game_id: gameId,
      date,
      status: 'UPCOMING',
    },
  });

  // Get game details and regulars
  const game = await db.game.findUnique({
    where: { id: gameId },
    include: {
      organizer: true,
      game_rosters: {
        where: { role: 'REGULAR' },
        include: { player: true },
      },
    },
  });

  if (!game) {
    throw new Error('Game not found');
  }

  // Create confirmation records for all regulars
  const confirmations = await Promise.all(
    game.game_rosters.map(roster =>
      db.gameConfirmation.create({
        data: {
          game_instance_id: gameInstance.id,
          player_id: roster.player_id,
          status: 'PENDING',
        },
      })
    )
  );

  // Send confirmation texts to regulars
  const dayName = format(date, 'EEEE');
  const timeStr = formatTime(game.time);
  const dateStr = format(date, 'M/d');

  await Promise.all(
    game.game_rosters.map(roster => {
      const message = `${dayName} ${timeStr} at ${game.location} (${dateStr}) — you in? Reply YES or NO`;
      return sendSMS(roster.player.phone, message);
    })
  );

  return gameInstance;
}

/**
 * Handle a player's response to confirmation
 */
export async function handleConfirmationResponse(
  gameInstanceId: string,
  playerPhone: string,
  response: string
) {
  // Find the player and confirmation
  const player = await db.player.findUnique({
    where: { phone: playerPhone },
  });

  if (!player) {
    return { success: false, message: 'Player not found' };
  }

  const confirmation = await db.gameConfirmation.findUnique({
    where: {
      game_instance_id_player_id: {
        game_instance_id: gameInstanceId,
        player_id: player.id,
      },
    },
    include: {
      game_instance: {
        include: {
          game: {
            include: { organizer: true },
          },
        },
      },
    },
  });

  if (!confirmation) {
    return { success: false, message: 'No confirmation found for this game' };
  }

  // Parse the SMS response
  const parsed = parseSMSResponse(response);

  if (parsed.type === 'unknown' || parsed.confidence < 0.6) {
    const clarificationMessage = generateClarificationMessage(response);
    return { success: false, message: clarificationMessage };
  }

  const isYes = parsed.type === 'confirmation';
  const isNo = parsed.type === 'decline';

  // Update confirmation status
  await db.gameConfirmation.update({
    where: { id: confirmation.id },
    data: {
      status: isYes ? 'CONFIRMED' : 'DECLINED',
      responded_at: new Date(),
    },
  });

  const game = confirmation.game_instance.game;

  if (isYes) {
    // Player confirmed
    await sendSMS(playerPhone, `You're confirmed! See you ${format(confirmation.game_instance.date, 'EEEE')} at ${game.location}.`);
  } else {
    // Player declined - need to find a sub
    await sendSMS(playerPhone, 'Got it, you\'re out this week. See you next time!');
    await findAndNotifyNextSub(confirmation.game_instance.id, game.id);
  }

  // Notify organizer of roster status
  await notifyOrganizerOfRosterStatus(confirmation.game_instance.id);

  return { success: true, message: isYes ? 'Confirmed' : 'Declined' };
}

/**
 * Find the next available sub and send them a notification
 */
export async function findAndNotifyNextSub(gameInstanceId: string, gameId: string) {
  // Get game details
  const gameInstance = await db.gameInstance.findUnique({
    where: { id: gameInstanceId },
    include: {
      game: true,
    },
  });

  if (!gameInstance) return;

  // Get subs ordered by priority (lower number = higher priority)
  const subs = await db.gameRoster.findMany({
    where: {
      game_id: gameId,
      role: 'SUB',
    },
    include: { player: true },
    orderBy: { priority: 'asc' },
  });

  // Find subs who haven't been asked yet for this game instance
  const existingConfirmations = await db.gameConfirmation.findMany({
    where: { game_instance_id: gameInstanceId },
    select: { player_id: true },
  });

  const askedPlayerIds = new Set(existingConfirmations.map(c => c.player_id));
  const availableSubs = subs.filter(sub => !askedPlayerIds.has(sub.player_id));

  if (availableSubs.length === 0) {
    return; // No more subs available
  }

  // Ask the highest priority available sub
  const nextSub = availableSubs[0];

  // Create confirmation record for the sub
  await db.gameConfirmation.create({
    data: {
      game_instance_id: gameInstanceId,
      player_id: nextSub.player_id,
      status: 'PENDING',
    },
  });

  // Send notification to sub
  const dayName = format(gameInstance.date, 'EEEE');
  const timeStr = formatTime(gameInstance.game.time);
  const dateStr = format(gameInstance.date, 'M/d');
  const message = `Spot opened for ${dayName} ${timeStr} at ${gameInstance.game.location} (${dateStr})! Reply YES to claim it.`;

  await sendSMS(nextSub.player.phone, message);
}

/**
 * Handle a sub's response to spot notification
 */
export async function handleSubResponse(
  gameInstanceId: string,
  playerPhone: string,
  response: string
) {
  const player = await db.player.findUnique({
    where: { phone: playerPhone },
  });

  if (!player) {
    return { success: false, message: 'Player not found' };
  }

  const confirmation = await db.gameConfirmation.findUnique({
    where: {
      game_instance_id_player_id: {
        game_instance_id: gameInstanceId,
        player_id: player.id,
      },
    },
    include: {
      game_instance: {
        include: {
          game: {
            include: { organizer: true },
          },
        },
      },
    },
  });

  if (!confirmation) {
    return { success: false, message: 'No spot available for this game' };
  }

  // Parse the SMS response
  const parsed = parseSMSResponse(response);

  if (parsed.type === 'unknown' || parsed.confidence < 0.6) {
    const clarificationMessage = generateClarificationMessage(response);
    return { success: false, message: clarificationMessage };
  }

  const isYes = parsed.type === 'confirmation';

  if (isYes) {
    // Sub claimed the spot
    await db.gameConfirmation.update({
      where: { id: confirmation.id },
      data: {
        status: 'CONFIRMED',
        responded_at: new Date(),
      },
    });

    const game = confirmation.game_instance.game;
    await sendSMS(playerPhone, `You're in! See you ${format(confirmation.game_instance.date, 'EEEE')} ${formatTime(game.time)} at ${game.location}.`);

    // Notify other pending subs that spot is filled
    await notifyOtherSubsSpotFilled(gameInstanceId, player.id);

    // Notify organizer
    await notifyOrganizerOfRosterStatus(gameInstanceId);
  } else {
    // Sub declined - mark as declined and try next sub
    await db.gameConfirmation.update({
      where: { id: confirmation.id },
      data: {
        status: 'DECLINED',
        responded_at: new Date(),
      },
    });

    const game = confirmation.game_instance.game;
    await findAndNotifyNextSub(gameInstanceId, game.id);
  }

  return { success: true, message: isYes ? 'Spot claimed' : 'Declined' };
}

/**
 * Notify other pending subs that the spot has been filled
 */
async function notifyOtherSubsSpotFilled(gameInstanceId: string, claimedByPlayerId: string) {
  const pendingSubs = await db.gameConfirmation.findMany({
    where: {
      game_instance_id: gameInstanceId,
      status: 'PENDING',
      player_id: { not: claimedByPlayerId },
    },
    include: { player: true },
  });

  await Promise.all(
    pendingSubs.map(async (confirmation) => {
      await db.gameConfirmation.update({
        where: { id: confirmation.id },
        data: { status: 'NO_RESPONSE' },
      });

      await sendSMS(
        confirmation.player.phone,
        'Spot filled, you\'re still on the sub list for future games.'
      );
    })
  );
}

/**
 * Notify organizer of current roster status
 */
async function notifyOrganizerOfRosterStatus(gameInstanceId: string) {
  const gameInstance = await db.gameInstance.findUnique({
    where: { id: gameInstanceId },
    include: {
      game: {
        include: { organizer: true },
      },
      game_confirmations: {
        where: { status: 'CONFIRMED' },
        include: { player: true },
      },
    },
  });

  if (!gameInstance) return;

  const confirmedCount = gameInstance.game_confirmations.length;
  const totalSpots = gameInstance.game.total_spots;
  const lastConfirmedPlayer = gameInstance.game_confirmations[gameInstance.game_confirmations.length - 1];

  const dayName = format(gameInstance.date, 'EEEE');
  let message = '';

  if (lastConfirmedPlayer) {
    message = `${lastConfirmedPlayer.player.name} claimed the open spot. `;
  }

  message += `${dayName} roster: ${confirmedCount}/${totalSpots} filled.`;

  await sendSMS(gameInstance.game.organizer.phone, message);
}

/**
 * Lock roster and send payment reminders
 */
export async function lockRosterAndSendPaymentReminders(gameInstanceId: string) {
  const gameInstance = await db.gameInstance.findUnique({
    where: { id: gameInstanceId },
    include: {
      game: {
        include: { organizer: true },
      },
      game_confirmations: {
        where: { status: 'CONFIRMED' },
        include: { player: true },
      },
    },
  });

  if (!gameInstance) return;

  // Update game instance status
  await db.gameInstance.update({
    where: { id: gameInstanceId },
    data: { status: 'CONFIRMED' },
  });

  const game = gameInstance.game;
  const confirmedPlayers = gameInstance.game_confirmations;

  // Initialize payment status for all confirmed players
  const paymentStatus = Number(game.cost_per_player) > 0 ? 'UNPAID' : 'FREE';
  await Promise.all(
    confirmedPlayers.map(confirmation => 
      db.gameConfirmation.update({
        where: { id: confirmation.id },
        data: { payment_status: paymentStatus as any },
      })
    )
  );

  if (game.organizer.venmo_username && Number(game.cost_per_player) > 0) {
    // Send payment reminders with Venmo links
    const paymentNote = generatePaymentNote(game.name, gameInstance.date);
    const venmoLink = generateVenmoLink(
      game.organizer.venmo_username,
      Number(game.cost_per_player),
      paymentNote
    );

    const dayName = format(gameInstance.date, 'EEEE');
    const tomorrow = format(addDays(new Date(), 1), 'EEEE') === dayName ? 'Tomorrow' : dayName;

    await Promise.all(
      confirmedPlayers.map(confirmation => {
        const message = `${tomorrow} ${formatTime(game.time)} at ${game.location} — you're confirmed! Pay $${Number(game.cost_per_player)} → ${venmoLink}`;
        return sendSMS(confirmation.player.phone, message);
      })
    );

    // Notify organizer
    await sendSMS(
      game.organizer.phone,
      `Roster locked: ${confirmedPlayers.length}/${game.total_spots}. All payment links sent.`
    );
  } else {
    // Just send confirmation without payment
    const dayName = format(gameInstance.date, 'EEEE');
    const tomorrow = format(addDays(new Date(), 1), 'EEEE') === dayName ? 'Tomorrow' : dayName;

    await Promise.all(
      confirmedPlayers.map(confirmation => {
        const message = `${tomorrow} ${formatTime(game.time)} at ${game.location} — you're confirmed!`;
        return sendSMS(confirmation.player.phone, message);
      })
    );

    // Notify organizer
    await sendSMS(
      game.organizer.phone,
      `Roster locked: ${confirmedPlayers.length}/${game.total_spots}.`
    );
  }
}

/**
 * Get roster status for a game instance
 */
export async function getRosterStatus(gameInstanceId: string) {
  const gameInstance = await db.gameInstance.findUnique({
    where: { id: gameInstanceId },
    include: {
      game: true,
      game_confirmations: {
        include: { player: true },
        orderBy: { created_at: 'asc' },
      },
    },
  });

  if (!gameInstance) {
    throw new Error('Game instance not found');
  }

  const confirmed = gameInstance.game_confirmations.filter(c => c.status === 'CONFIRMED');
  const pending = gameInstance.game_confirmations.filter(c => c.status === 'PENDING');
  const declined = gameInstance.game_confirmations.filter(c => c.status === 'DECLINED');
  const noResponse = gameInstance.game_confirmations.filter(c => c.status === 'NO_RESPONSE');

  return {
    gameInstance,
    confirmed,
    pending,
    declined,
    noResponse,
    openSpots: gameInstance.game.total_spots - confirmed.length,
  };
}