import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; rosterId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Find the roster entry and verify ownership
    const roster = await db.gameRoster.findUnique({
      where: { id: params.rosterId },
      include: {
        game: {
          select: { organizer_id: true }
        }
      }
    });

    if (!roster) {
      return NextResponse.json({ error: 'Roster entry not found' }, { status: 404 });
    }

    if (roster.game.organizer_id !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete the roster entry
    await db.gameRoster.delete({
      where: { id: params.rosterId }
    });

    // If this was a sub, reorder the remaining subs to close the gap
    if (roster.role === 'SUB' && roster.priority) {
      await db.gameRoster.updateMany({
        where: {
          game_id: roster.game_id,
          role: 'SUB',
          priority: { gt: roster.priority }
        },
        data: {
          priority: { decrement: 1 }
        }
      });
    }

    return NextResponse.json({ message: 'Player removed from roster' });
  } catch (error: any) {
    console.error('Remove player error:', error);
    return NextResponse.json(
      { error: 'Failed to remove player' },
      { status: 500 }
    );
  }
}