import { createClient } from '@supabase/supabase-js';
import { getRequiredEnv, getOptionalEnv } from '@/lib/env';

export function getSupabaseAdmin() {
  return createClient(getRequiredEnv('SUPABASE_URL'), getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getReadingsTable() {
  return getOptionalEnv('SUPABASE_READINGS_TABLE', 'blood_pressure_readings');
}
