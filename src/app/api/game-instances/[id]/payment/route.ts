import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const updatePaymentSchema = z.object({
  playerId: z.string(),
  status: z.enum(['PAID', 'UNPAID', 'FREE']),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const gameInstanceId = params.id;
    const body = await request.json();
    const { playerId, status } = updatePaymentSchema.parse(body);

    // Verify the user owns this game
    const gameInstance = await db.gameInstance.findUnique({
      where: { id: gameInstanceId },
      include: {
        game: { select: { organizer_id: true } },
      },
    });

    if (!gameInstance) {
      return NextResponse.json({ error: 'Game instance not found' }, { status: 404 });
    }

    if (gameInstance.game.organizer_id !== session.user.id) {
      return NextResponse.json({ error: 'Not your game' }, { status: 403 });
    }

    // Update payment status
    const confirmation = await db.gameConfirmation.update({
      where: {
        game_instance_id_player_id: {
          game_instance_id: gameInstanceId,
          player_id: playerId,
        },
      },
      data: {
        payment_status: status as any,
        paid_at: status === 'PAID' ? new Date() : null,
      },
      include: {
        player: true,
      },
    });

    return NextResponse.json({
      message: 'Payment status updated',
      confirmation: {
        id: confirmation.id,
        playerName: confirmation.player.name,
        paymentStatus: confirmation.payment_status,
        paidAt: confirmation.paid_at,
      },
    });

  } catch (error: any) {
    console.error('Update payment status error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update payment status' },
      { status: 500 }
    );
  }
}