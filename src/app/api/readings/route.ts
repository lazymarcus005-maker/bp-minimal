import { NextResponse } from 'next/server';
import { assertPasscode } from '@/lib/passcode';
import { getReadingsTable, getSupabaseAdmin } from '@/lib/supabase';
import { saveReadingSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    assertPasscode(req);
    const json = await req.json();
    const payload = saveReadingSchema.parse(json);

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(getReadingsTable())
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown save error';
    const status = message === 'Invalid passcode' ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
