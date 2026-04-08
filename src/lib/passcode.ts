import { getOptionalEnv } from '@/lib/env';

function decodePasscodeHeader(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function assertPasscode(req: Request): void {
  const expected = getOptionalEnv('APP_PASSCODE');
  if (!expected) return;

  const provided = req.headers.get('x-app-passcode') ?? '';
  const decodedProvided = decodePasscodeHeader(provided);

  if (provided !== expected && decodedProvided !== expected) {
    throw new Error('Invalid passcode');
  }
}
