import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    nextauth_url: process.env.NEXTAUTH_URL || 'NOT_SET',
    nextauth_secret_length: process.env.NEXTAUTH_SECRET?.length || 0,
    database_url_set: !!process.env.DATABASE_URL,
    vercel_url: process.env.VERCEL_URL || 'NOT_SET',
    node_env: process.env.NODE_ENV,
  });
}