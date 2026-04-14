import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const createGameSchema = z.object({
  name: z.string().min(1, 'Game name is required'),
  location: z.string().min(1, 'Location is required'),
  day_of_week: z.number().min(0).max(6),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  total_spots: z.number().min(2).max(20),
  cost_per_player: z.number().min(0),
  confirm_deadline_days: z.number().min(1).max(7), // 1 to 7 days
  is_recurring: z.boolean(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createGameSchema.parse(body);

    const game = await db.game.create({
      data: {
        ...validatedData,
        organizer_id: session.user.id,
      },
      include: {
        organizer: true,
        game_rosters: {
          include: { player: true },
        },
      },
    });

    return NextResponse.json({
      message: 'Game created successfully',
      game,
    });
  } catch (error: any) {
    console.error('Create game error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create game' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const games = await db.game.findMany({
      where: { organizer_id: session.user.id },
      include: {
        game_rosters: {
          include: { player: true },
          orderBy: [
            { role: 'asc' },
            { priority: 'asc' },
            { created_at: 'asc' },
          ],
        },
        game_instances: {
          where: { date: { gte: new Date() } },
          take: 3,
          orderBy: { date: 'asc' },
          include: {
            game_confirmations: {
              include: { player: true },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ games });
  } catch (error: any) {
    console.error('Get games error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    );
  }
}