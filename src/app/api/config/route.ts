import { NextResponse } from 'next/server';
import { getOptionalEnv } from '@/lib/env';

export const runtime = 'nodejs';

export async function GET() {
  const passcode = getOptionalEnv('APP_PASSCODE');
  return NextResponse.json({ 
    requiresPasscode: !!passcode,
  });
}
