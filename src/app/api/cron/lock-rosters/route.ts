import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { lockRosterAndSendPaymentReminders } from '@/lib/roster';
import { addHours, format } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    // Verify the request is authorized
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Running lock rosters cron job');

    // Find game instances that should be locked
    // (games happening within 24 hours that aren't already confirmed)
    const cutoffDate = addHours(new Date(), 24);

    const gameInstancesToLock = await db.gameInstance.findMany({
      where: {
        status: 'UPCOMING',
        date: {
          lte: cutoffDate,
          gte: new Date(), // Don't lock past games
        },
      },
      include: {
        game: {
          include: { organizer: true },
        },
        game_confirmations: {
          include: { player: true },
        },
      },
    });

    let processedInstances = 0;
    const results = [];

    for (const instance of gameInstancesToLock) {
      try {
        const confirmedCount = instance.game_confirmations.filter(
          c => c.status === 'CONFIRMED'
        ).length;

        await lockRosterAndSendPaymentReminders(instance.id);

        results.push({
          gameInstanceId: instance.id,
          gameName: instance.game.name,
          gameDate: format(instance.date, 'yyyy-MM-dd'),
          confirmedPlayers: confirmedCount,
          totalSpots: instance.game.total_spots,
          organizerName: instance.game.organizer.name,
          status: 'success',
        });

        processedInstances++;
      } catch (error: any) {
        console.error(`Failed to lock roster for game instance ${instance.id}:`, error);
        results.push({
          gameInstanceId: instance.id,
          gameName: instance.game.name,
          gameDate: format(instance.date, 'yyyy-MM-dd'),
          status: 'error',
          error: error.message,
        });
      }
    }

    console.log(`Lock rosters cron completed: ${processedInstances} instances processed`);

    return NextResponse.json({
      message: 'Lock rosters cron completed',
      processedInstances,
      totalInstances: gameInstancesToLock.length,
      results,
    });
  } catch (error: any) {
    console.error('Lock rosters cron error:', error);
    return NextResponse.json(
      { error: 'Failed to run lock rosters cron' },
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