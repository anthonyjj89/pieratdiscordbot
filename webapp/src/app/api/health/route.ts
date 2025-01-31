import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { 
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: {
        nextauth_url: !!process.env.NEXTAUTH_URL,
        mongodb: !!process.env.MONGODB_URI,
        discord: !!process.env.DISCORD_CLIENT_ID
      }
    },
    { status: 200 }
  );
}
