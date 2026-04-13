import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatPhoneNumber } from '@/lib/twilio';
import { z } from 'zod';

const addPlayerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  role: z.enum(['REGULAR', 'SUB']),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = addPlayerSchema.parse(body);

    // Verify user owns this game
    const game = await db.game.findUnique({
      where: {
        id: params.id,
        organizer_id: session.user.id,
      },
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(validatedData.phone);

    // Find or create player
    let player = await db.player.findUnique({
      where: { phone: formattedPhone },
    });

    if (!player) {
      player = await db.player.create({
        data: {
          name: validatedData.name,
          phone: formattedPhone,
        },
      });
    }

    // Check if player is already on this game's roster
    const existingRoster = await db.gameRoster.findUnique({
      where: {
        game_id_player_id: {
          game_id: params.id,
          player_id: player.id,
        },
      },
    });

    if (existingRoster) {
      return NextResponse.json({ error: 'Player already on roster' }, { status: 400 });
    }

    // Calculate priority for subs (next available priority)
    let priority = null;
    if (validatedData.role === 'SUB') {
      const lastSub = await db.gameRoster.findFirst({
        where: {
          game_id: params.id,
          role: 'SUB',
        },
        orderBy: { priority: 'desc' },
      });
      priority = (lastSub?.priority || 0) + 1;
    }

    // Add player to roster
    const roster = await db.gameRoster.create({
      data: {
        game_id: params.id,
        player_id: player.id,
        role: validatedData.role,
        priority,
      },
      include: {
        player: true,
      },
    });

    return NextResponse.json({ roster });
  } catch (error: any) {
    console.error('Add player error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to add player' },
      { status: 500 }
    );
  }
}