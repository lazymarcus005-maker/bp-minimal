import { getOptionalEnv } from '@/lib/env';

export function assertPasscode(req: Request): void {
  const expected = getOptionalEnv('APP_PASSCODE');
  if (!expected) return;

  const provided = req.headers.get('x-app-passcode') ?? '';
  if (provided !== expected) {
    throw new Error('Invalid passcode');
  }
}
