import { NextRequest, NextResponse } from 'next/server';
import { createOrganizer } from '@/lib/auth';
import { formatPhoneNumber } from '@/lib/twilio';
import { z } from 'zod';

const signUpSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Valid phone number is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  venmo_username: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = signUpSchema.parse(body);

    // Format phone number
    const formattedPhone = formatPhoneNumber(validatedData.phone);

    // Create organizer
    const organizer = await createOrganizer({
      ...validatedData,
      phone: formattedPhone,
    });

    // Return success (without password hash)
    const { password_hash, ...safeOrganizer } = organizer;

    return NextResponse.json({
      message: 'Account created successfully',
      organizer: safeOrganizer,
    });
  } catch (error: any) {
    console.error('Signup error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}