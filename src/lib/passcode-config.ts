import { getOptionalEnv } from '@/lib/env';

export function getEmbeddedPasscode(): string | null {
  const passcode = getOptionalEnv('APP_PASSCODE');
  return passcode ? passcode : null;
}
