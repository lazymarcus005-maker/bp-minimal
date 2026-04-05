import { NextResponse } from 'next/server';
import { buildDashboard, type ReadingRow } from '@/lib/dashboard';
import { assertPasscode } from '@/lib/passcode';
import { getReadingsTable, getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    assertPasscode(req);

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(getReadingsTable())
      .select('*')
      .order('measured_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(buildDashboard((data ?? []) as ReadingRow[]));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown dashboard error';
    const status = message === 'Invalid passcode' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
