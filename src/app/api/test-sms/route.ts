import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { createGameInstanceAndSendConfirmations } from '@/lib/roster';
import { addDays } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { gameId } = await request.json();

    if (!gameId) {
      return NextResponse.json({ error: 'gameId required' }, { status: 400 });
    }

    // Verify user owns this game
    const game = await db.game.findUnique({
      where: {
        id: gameId,
        organizer_id: session.user.id,
      },
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Calculate next game date based on the game's day_of_week
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const gameDayOfWeek = game.day_of_week;
    
    let daysToAdd = gameDayOfWeek - currentDay;
    if (daysToAdd <= 0) {
      daysToAdd += 7; // Next week if day already passed
    }
    
    const nextGameDate = addDays(today, daysToAdd);

    // Delete existing test instance if it exists (for testing purposes)
    await db.gameInstance.deleteMany({
      where: {
        game_id: gameId,
        date: nextGameDate,
      },
    });



    // Create game instance and send confirmation SMSs
    const gameInstance = await createGameInstanceAndSendConfirmations(gameId, nextGameDate);

    return NextResponse.json({
      message: 'Game instance created and SMS confirmations sent',
      gameInstance: {
        id: gameInstance.id,
        date: gameInstance.date,
        status: gameInstance.status,
      },
    });
  } catch (error: any) {
    console.error('Test SMS error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create game instance' },
      { status: 500 }
    );
  }
}