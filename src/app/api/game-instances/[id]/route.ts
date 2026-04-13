import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Find the game instance and verify ownership
    const gameInstance = await db.gameInstance.findUnique({
      where: { id: params.id },
      include: {
        game: {
          select: { organizer_id: true }
        }
      }
    });

    if (!gameInstance) {
      return NextResponse.json({ error: 'Game instance not found' }, { status: 404 });
    }

    if (gameInstance.game.organizer_id !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete the game instance (this will cascade delete confirmations)
    await db.gameInstance.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: 'Game instance deleted' });
  } catch (error: any) {
    console.error('Delete game instance error:', error);
    return NextResponse.json(
      { error: 'Failed to delete game instance' },
      { status: 500 }
    );
  }
}