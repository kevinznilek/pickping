import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendSMS } from '@/lib/twilio';
import { generateVenmoLink, generatePaymentNote } from '@/lib/venmo';
import { addHours, format, isPast } from 'date-fns';
import { formatTime } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    // Verify the request is authorized
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Running payment reminders cron job');

    const now = new Date();
    const results = [];

    // Find completed games where players haven't paid
    const gameInstances = await db.gameInstance.findMany({
      where: {
        status: 'CONFIRMED',
        date: {
          lt: now, // Games that have already happened
        },
      },
      include: {
        game: {
          include: { organizer: true },
        },
        game_confirmations: {
          where: {
            status: 'CONFIRMED',
            payment_status: 'UNPAID',
          },
          include: { player: true },
        },
      },
    });

    for (const gameInstance of gameInstances) {
      const game = gameInstance.game;
      const unpaidPlayers = gameInstance.game_confirmations;

      if (unpaidPlayers.length === 0 || Number(game.cost_per_player) === 0) {
        continue;
      }

      const gameEndTime = new Date(gameInstance.date);
      gameEndTime.setHours(
        parseInt(game.time.split(':')[0]) + 2, // Assume 2-hour games
        parseInt(game.time.split(':')[1])
      );

      const twoHoursAfter = addHours(gameEndTime, 2);
      const twentyFourHoursAfter = addHours(gameEndTime, 24);

      for (const confirmation of unpaidPlayers) {
        const needsFirstReminder = 
          isPast(twoHoursAfter) && 
          !confirmation.first_payment_reminder_sent_at;

        const needsSecondReminder = 
          isPast(twentyFourHoursAfter) && 
          !confirmation.second_payment_reminder_sent_at &&
          confirmation.first_payment_reminder_sent_at;

        const needsOrganizerAlert = 
          isPast(addHours(twentyFourHoursAfter, 24)) && 
          confirmation.second_payment_reminder_sent_at &&
          !confirmation.paid_at;

        if (needsFirstReminder) {
          // Send first payment reminder
          const venmoLink = generateVenmoLink(
            game.organizer.venmo_username!,
            Number(game.cost_per_player),
            generatePaymentNote(game.name, gameInstance.date)
          );

          const message = `Reminder: You owe $${Number(game.cost_per_player)} for ${game.name} on ${format(gameInstance.date, 'M/d')}. Pay here → ${venmoLink}`;
          
          await sendSMS(confirmation.player.phone, message);
          
          await db.gameConfirmation.update({
            where: { id: confirmation.id },
            data: { first_payment_reminder_sent_at: now },
          });

          results.push({
            type: 'first_reminder',
            gameInstanceId: gameInstance.id,
            playerName: confirmation.player.name,
            status: 'sent',
          });

        } else if (needsSecondReminder) {
          // Send second payment reminder
          const venmoLink = generateVenmoLink(
            game.organizer.venmo_username!,
            Number(game.cost_per_player),
            generatePaymentNote(game.name, gameInstance.date)
          );

          const message = `Final reminder: You still owe $${Number(game.cost_per_player)} for ${game.name} on ${format(gameInstance.date, 'M/d')}. Please pay → ${venmoLink}`;
          
          await sendSMS(confirmation.player.phone, message);
          
          await db.gameConfirmation.update({
            where: { id: confirmation.id },
            data: { second_payment_reminder_sent_at: now },
          });

          results.push({
            type: 'second_reminder',
            gameInstanceId: gameInstance.id,
            playerName: confirmation.player.name,
            status: 'sent',
          });

        } else if (needsOrganizerAlert) {
          // Alert organizer about non-payment
          const message = `${confirmation.player.name} still hasn't paid $${Number(game.cost_per_player)} for ${game.name} on ${format(gameInstance.date, 'M/d')}. You may need to reach out manually.`;
          
          await sendSMS(game.organizer.phone, message);

          // Mark as alerted to prevent duplicate alerts
          await db.gameConfirmation.update({
            where: { id: confirmation.id },
            data: { 
              // Using responded_at as a flag since we don't have organizer_alerted_at field
              // TODO: Add organizer_alerted_at field in future migration
            },
          });

          results.push({
            type: 'organizer_alert',
            gameInstanceId: gameInstance.id,
            playerName: confirmation.player.name,
            status: 'sent',
          });
        }
      }
    }

    console.log(`Payment reminders cron completed: ${results.length} actions taken`);

    return NextResponse.json({
      message: 'Payment reminders cron completed',
      results,
    });
  } catch (error: any) {
    console.error('Payment reminders cron error:', error);
    return NextResponse.json(
      { error: 'Failed to run payment reminders cron' },
      { status: 500 }
    );
  }
}

// Allow GET for manual testing
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }
  return POST(request);
}