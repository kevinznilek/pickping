import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json({ 
        success: false, 
        error: 'Email and password required',
        step: 'validation'
      });
    }
    
    console.log(`[AUTH DEBUG] Testing login for: ${email}`);
    
    // Step 1: Find organizer
    const organizer = await db.organizer.findUnique({
      where: { email: email.toLowerCase() },
    });
    
    if (!organizer) {
      return NextResponse.json({ 
        success: false, 
        error: 'No organizer found',
        step: 'find_user',
        email: email.toLowerCase()
      });
    }
    
    console.log(`[AUTH DEBUG] Found organizer: ${organizer.id}`);
    
    // Step 2: Check password
    const isPasswordValid = await bcrypt.compare(password, organizer.password_hash);
    
    if (!isPasswordValid) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid password',
        step: 'password_check',
        passwordLength: password.length,
        hashPreview: organizer.password_hash.substring(0, 10)
      });
    }
    
    console.log(`[AUTH DEBUG] Password valid for: ${organizer.id}`);
    
    // Step 3: Return success
    return NextResponse.json({ 
      success: true, 
      message: 'Authentication successful',
      user: {
        id: organizer.id,
        email: organizer.email,
        name: organizer.name
      }
    });
    
  } catch (error) {
    console.error('[AUTH DEBUG] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      step: 'exception',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Auth debug endpoint - POST with email/password to test'
  });
}