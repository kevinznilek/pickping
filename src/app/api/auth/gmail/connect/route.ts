import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAuthUrl } from '@/lib/gmail';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Get organizer
    const organizer = await db.organizer.findUnique({
      where: { email: session.user.email },
    });
    
    if (!organizer) {
      return NextResponse.json({ error: 'Organizer not found' }, { status: 404 });
    }
    
    // Validate Google OAuth credentials are configured
    if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'your-google-client-id-here') {
      console.error('GOOGLE_CLIENT_ID is not configured');
      return NextResponse.json(
        { error: 'Gmail integration is not configured. Set GOOGLE_CLIENT_ID in your environment.' },
        { status: 503 }
      );
    }
    if (!process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET === 'your-google-client-secret-here') {
      console.error('GOOGLE_CLIENT_SECRET is not configured');
      return NextResponse.json(
        { error: 'Gmail integration is not configured. Set GOOGLE_CLIENT_SECRET in your environment.' },
        { status: 503 }
      );
    }

    // Generate OAuth consent URL
    const authUrl = getAuthUrl(organizer.id);

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Gmail connect error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Gmail connection' },
      { status: 500 }
    );
  }
}