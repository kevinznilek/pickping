import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Test database connection by running a simple query
    const result = await db.$queryRaw`SELECT 1 as test`;

    // Get some basic stats if connection works
    const stats = await db.$transaction([
      db.organizer.count(),
      db.game.count(),
      db.player.count(),
      db.gameInstance.count(),
    ]);

    return NextResponse.json({
      status: 'success',
      message: 'Database connection successful',
      test_query: result,
      stats: {
        organizers: stats[0],
        games: stats[1],
        players: stats[2],
        game_instances: stats[3],
      },
      prisma_version: '5.22.0',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Database test error:', error);

    return NextResponse.json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}