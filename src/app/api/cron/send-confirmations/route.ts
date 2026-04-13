import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createGameInstanceAndSendConfirmations } from '@/lib/roster';
import { addDays, startOfDay, endOfDay, format } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    // Verify the request is authorized (you might want to add API key auth)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Running send confirmations cron job');

    // Get all active games
    const games = await db.game.findMany({
      include: {
        organizer: true,
        game_rosters: {
          where: { role: 'REGULAR' },
          include: { player: true },
        },
      },
    });

    let processedGames = 0;
    const results = [];

    for (const game of games) {
      // Calculate the target date based on confirm_deadline_hours
      const targetDate = addDays(new Date(), Math.ceil(game.confirm_deadline_hours / 24));

      // Find the next occurrence of this game's day of week
      let gameDate = new Date(targetDate);
      while (gameDate.getDay() !== game.day_of_week) {
        gameDate = addDays(gameDate, 1);
      }

      // Check if we already have a game instance for this date
      const existingInstance = await db.gameInstance.findUnique({
        where: {
          game_id_date: {
            game_id: game.id,
            date: gameDate,
          },
        },
      });

      if (existingInstance) {
        results.push({
          gameId: game.id,
          gameName: game.name,
          gameDate: format(gameDate, 'yyyy-MM-dd'),
          status: 'already_exists',
        });
        continue;
      }

      // Skip if there are no regulars to notify
      if (game.game_rosters.length === 0) {
        results.push({
          gameId: game.id,
          gameName: game.name,
          gameDate: format(gameDate, 'yyyy-MM-dd'),
          status: 'no_regulars',
        });
        continue;
      }

      try {
        // Create game instance and send confirmations
        const gameInstance = await createGameInstanceAndSendConfirmations(game.id, gameDate);

        results.push({
          gameId: game.id,
          gameName: game.name,
          gameDate: format(gameDate, 'yyyy-MM-dd'),
          gameInstanceId: gameInstance.id,
          regularsSent: game.game_rosters.length,
          status: 'success',
        });

        processedGames++;
      } catch (error: any) {
        console.error(`Failed to process game ${game.id}:`, error);
        results.push({
          gameId: game.id,
          gameName: game.name,
          gameDate: format(gameDate, 'yyyy-MM-dd'),
          status: 'error',
          error: error.message,
        });
      }
    }

    console.log(`Send confirmations cron completed: ${processedGames} games processed`);

    return NextResponse.json({
      message: 'Send confirmations cron completed',
      processedGames,
      totalGames: games.length,
      results,
    });
  } catch (error: any) {
    console.error('Send confirmations cron error:', error);
    return NextResponse.json(
      { error: 'Failed to run send confirmations cron' },
      { status: 500 }
    );
  }
}

// Allow GET for manual testing (remove in production)
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }
  return POST(request);
}