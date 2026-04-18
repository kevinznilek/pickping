import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatPhoneNumber } from '@/lib/twilio';
import { z } from 'zod';

const bulkPlayerSchema = z.object({
  players: z.array(z.object({
    name: z.string().min(1, 'Name is required'),
    phone: z.string().min(10, 'Valid phone number is required'),
    role: z.enum(['REGULAR', 'SUB']),
  })).min(1, 'At least one player is required'),
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
    const validatedData = bulkPlayerSchema.parse(body);

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

    const results = {
      added: [] as any[],
      skipped: [] as any[],
      errors: [] as any[],
    };

    // Get current max priority for subs
    const lastSub = await db.gameRoster.findFirst({
      where: {
        game_id: params.id,
        role: 'SUB',
      },
      orderBy: { priority: 'desc' },
    });
    let nextSubPriority = (lastSub?.priority || 0) + 1;

    // Process each player
    for (const playerData of validatedData.players) {
      try {
        // Format phone number
        const formattedPhone = formatPhoneNumber(playerData.phone);

        // Find or create player
        let player = await db.player.findUnique({
          where: { phone: formattedPhone },
        });

        if (!player) {
          player = await db.player.create({
            data: {
              name: playerData.name,
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
          results.skipped.push({
            name: playerData.name,
            phone: playerData.phone,
            reason: 'Already on roster',
          });
          continue;
        }

        // Calculate priority for subs
        let priority = null;
        if (playerData.role === 'SUB') {
          priority = nextSubPriority++;
        }

        // Add player to roster
        const roster = await db.gameRoster.create({
          data: {
            game_id: params.id,
            player_id: player.id,
            role: playerData.role,
            priority,
          },
          include: {
            player: true,
          },
        });

        results.added.push({
          name: playerData.name,
          phone: playerData.phone,
          role: playerData.role,
          roster,
        });

      } catch (error: any) {
        console.error(`Error adding player ${playerData.name}:`, error);
        results.errors.push({
          name: playerData.name,
          phone: playerData.phone,
          error: error.message || 'Failed to add player',
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('Bulk import error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to import players' },
      { status: 500 }
    );
  }
}