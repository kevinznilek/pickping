import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleConfirmationResponse, handleSubResponse } from '@/lib/roster';
import { sendSMS } from '@/lib/twilio';

export async function POST(request: NextRequest) {
  try {
    // Parse Twilio webhook data (form-encoded)
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const body = formData.get('Body') as string;

    if (!from || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Clean up the phone number
    const phoneNumber = from.replace(/\D/g, '').replace(/^1/, ''); // Remove +1 country code if present
    const formattedPhone = phoneNumber.length === 10 ? `+1${phoneNumber}` : `+${phoneNumber}`;

    console.log(`SMS received from ${formattedPhone}: ${body}`);

    // Find the player
    const player = await db.player.findUnique({
      where: { phone: formattedPhone },
    });

    if (!player) {
      // Send a helpful message to unknown numbers
      await sendSMS(
        formattedPhone,
        'Hi! This number is used for PickPing game confirmations. If you think you received this in error, please contact your game organizer.'
      );
      return NextResponse.json({ message: 'Player not found, sent help message' });
    }

    // Look for active game confirmations for this player
    const activeConfirmations = await db.gameConfirmation.findMany({
      where: {
        player_id: player.id,
        status: 'PENDING',
        game_instance: {
          status: 'UPCOMING',
          date: { gte: new Date() }, // Only future games
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
      orderBy: {
        game_instance: { date: 'asc' },
      },
    });

    if (activeConfirmations.length === 0) {
      // No pending confirmations - send a polite message
      await sendSMS(
        formattedPhone,
        'No pending game confirmations found. If you have questions, please contact your game organizer.'
      );
      return NextResponse.json({ message: 'No active confirmations' });
    }

    // Use the most recent/upcoming confirmation
    const confirmation = activeConfirmations[0];
    const gameInstance = confirmation.game_instance;

    // Determine if this is a regular confirmation or sub response
    // Check if this player is a regular for this game
    const roster = await db.gameRoster.findUnique({
      where: {
        game_id_player_id: {
          game_id: gameInstance.game_id,
          player_id: player.id,
        },
      },
    });

    let result;

    if (roster?.role === 'REGULAR') {
      // This is a regular player responding to confirmation
      result = await handleConfirmationResponse(
        gameInstance.id,
        formattedPhone,
        body.trim()
      );
    } else {
      // This is a sub responding to a spot notification
      result = await handleSubResponse(
        gameInstance.id,
        formattedPhone,
        body.trim()
      );
    }

    if (!result.success) {
      // Send error message back to player
      await sendSMS(formattedPhone, result.message);
    }

    return NextResponse.json({
      message: result.success ? 'Response processed successfully' : 'Response processed with error',
      details: result.message,
    });
  } catch (error: any) {
    console.error('SMS webhook error:', error);

    // Try to send an error message to the sender if we have their phone number
    const formData = await request.formData().catch(() => null);
    const from = formData?.get('From') as string;

    if (from) {
      try {
        await sendSMS(
          from,
          'Sorry, there was an error processing your response. Please try again or contact your game organizer.'
        );
      } catch (smsError) {
        console.error('Failed to send error message:', smsError);
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}