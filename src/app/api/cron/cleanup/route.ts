import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { subDays, format } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    // Verify the request is authorized
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Running cleanup cron job');

    const results = {
      completedGames: 0,
      expiredConfirmations: 0,
    };

    // Mark past games as completed if they're not already
    const pastGames = await db.gameInstance.findMany({
      where: {
        status: {
          in: ['UPCOMING', 'CONFIRMED'],
        },
        date: {
          lt: subDays(new Date(), 1), // Games from yesterday or earlier
        },
      },
    });

    if (pastGames.length > 0) {
      const updateResult = await db.gameInstance.updateMany({
        where: {
          id: {
            in: pastGames.map(g => g.id),
          },
        },
        data: {
          status: 'COMPLETED',
        },
      });

      results.completedGames = updateResult.count;
      console.log(`Marked ${updateResult.count} past games as completed`);
    }

    // Update expired confirmations to NO_RESPONSE
    // (confirmations that are still pending for games happening within 2 hours)
    const expiredConfirmations = await db.gameConfirmation.findMany({
      where: {
        status: 'PENDING',
        game_instance: {
          date: {
            lt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
          },
          status: {
            not: 'COMPLETED',
          },
        },
      },
    });

    if (expiredConfirmations.length > 0) {
      const expiredResult = await db.gameConfirmation.updateMany({
        where: {
          id: {
            in: expiredConfirmations.map(c => c.id),
          },
        },
        data: {
          status: 'NO_RESPONSE',
        },
      });

      results.expiredConfirmations = expiredResult.count;
      console.log(`Marked ${expiredResult.count} confirmations as expired`);
    }

    console.log('Cleanup cron completed');

    return NextResponse.json({
      message: 'Cleanup cron completed',
      results,
    });
  } catch (error: any) {
    console.error('Cleanup cron error:', error);
    return NextResponse.json(
      { error: 'Failed to run cleanup cron' },
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