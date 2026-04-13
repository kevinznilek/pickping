import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; rosterId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { direction } = await request.json();
    
    if (!['up', 'down'].includes(direction)) {
      return NextResponse.json({ error: 'Invalid direction' }, { status: 400 });
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

    if (roster.role !== 'SUB' || !roster.priority) {
      return NextResponse.json({ error: 'Can only reorder subs' }, { status: 400 });
    }

    const currentPriority = roster.priority;
    const newPriority = direction === 'up' ? currentPriority - 1 : currentPriority + 1;

    // Check bounds
    if (newPriority < 1) {
      return NextResponse.json({ error: 'Already at highest priority' }, { status: 400 });
    }

    // Check if there's a sub at the target priority
    const targetSub = await db.gameRoster.findFirst({
      where: {
        game_id: roster.game_id,
        role: 'SUB',
        priority: newPriority,
      },
    });

    if (!targetSub && direction === 'down') {
      return NextResponse.json({ error: 'Already at lowest priority' }, { status: 400 });
    }

    // Swap priorities
    await db.$transaction([
      // Set the target sub to the current priority
      db.gameRoster.update({
        where: { id: targetSub!.id },
        data: { priority: currentPriority },
      }),
      // Set the current sub to the new priority
      db.gameRoster.update({
        where: { id: params.rosterId },
        data: { priority: newPriority },
      }),
    ]);

    return NextResponse.json({ message: 'Priority updated' });
  } catch (error: any) {
    console.error('Update priority error:', error);
    return NextResponse.json(
      { error: 'Failed to update priority' },
      { status: 500 }
    );
  }
}