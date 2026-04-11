import crypto from 'node:crypto';
import { getRequiredEnv } from '@/lib/env';

export class LineRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'LineRequestError';
  }
}

function getLineChannelSecret() {
  return getRequiredEnv('LINE_CHANNEL_SECRET');
}

function getLineChannelAccessToken() {
  return getRequiredEnv('LINE_CHANNEL_ACCESS_TOKEN');
}

export function assertLineSignature(req: Request, body: string): void {
  const signature = req.headers.get('x-line-signature');
  if (!signature) {
    throw new LineRequestError('Missing LINE signature', 401);
  }

  const expectedDigest = crypto.createHmac('sha256', getLineChannelSecret()).update(body).digest();
  const receivedDigest = Buffer.from(signature, 'base64');

  if (receivedDigest.length !== expectedDigest.length) {
    throw new LineRequestError('Invalid LINE signature', 401);
  }

  if (!crypto.timingSafeEqual(receivedDigest, expectedDigest)) {
    throw new LineRequestError('Invalid LINE signature', 401);
  }
}

export async function fetchLineMessageImage(messageId: string): Promise<{ bytes: Buffer; mimeType: string }> {
  const response = await fetch(`https://api-data.line.me/v2/bot/message/${encodeURIComponent(messageId)}/content`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${getLineChannelAccessToken()}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LINE content API error: ${response.status} ${text}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const mimeType = (response.headers.get('content-type') ?? 'image/jpeg').split(';')[0] || 'image/jpeg';

  if (!mimeType.startsWith('image/')) {
    throw new Error(`LINE content is not an image: ${mimeType}`);
  }

  return { bytes, mimeType };
}
