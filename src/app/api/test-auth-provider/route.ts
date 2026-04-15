import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // Simulate the exact logic from NextAuth credentials provider
    const organizer = await db.organizer.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!organizer) {
      return NextResponse.json({ error: 'No organizer found with this email' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, organizer.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Return what NextAuth would get
    const user = {
      id: organizer.id,
      email: organizer.email,
      name: organizer.name,
    };

    return NextResponse.json({ 
      success: true, 
      user,
      message: 'Credentials provider logic works'
    });
    
  } catch (error) {
    console.error('Auth provider test error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}