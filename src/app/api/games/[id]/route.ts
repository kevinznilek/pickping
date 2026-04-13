import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { addDays, startOfWeek, endOfWeek } from 'date-fns';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const game = await db.game.findUnique({
      where: {
        id: params.id,
        organizer_id: session.user.id, // Ensure user owns this game
      },
      include: {
        organizer: true,
        game_rosters: {
          include: { player: true },
          orderBy: [
            { role: 'asc' }, // REGULAR first, then SUB
            { priority: 'asc' }, // For subs, lower priority number = higher priority
            { created_at: 'asc' },
          ],
        },
        game_instances: {
          where: {
            date: {
              gte: startOfWeek(new Date()),
              lte: endOfWeek(addDays(new Date(), 14)), // Next 3 weeks
            },
          },
          include: {
            game_confirmations: {
              include: { player: true },
            },
          },
          orderBy: { date: 'asc' },
        },
      },
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    return NextResponse.json(game);
  } catch (error: any) {
    console.error('Get game error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game' },
      { status: 500 }
    );
  }
}