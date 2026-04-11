import crypto from 'node:crypto';
import { getRequiredEnv } from '@/lib/env';

function getLineChannelSecret() {
  return getRequiredEnv('LINE_CHANNEL_SECRET');
}

function getLineChannelAccessToken() {
  return getRequiredEnv('LINE_CHANNEL_ACCESS_TOKEN');
}

export function assertLineSignature(req: Request, body: string): void {
  const signature = req.headers.get('x-line-signature');
  if (!signature) {
    throw new Error('Missing LINE signature');
  }

  const expected = crypto
    .createHmac('sha256', getLineChannelSecret())
    .update(body)
    .digest('base64');

  const signatureBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');

  if (signatureBuffer.length !== expectedBuffer.length) {
    throw new Error('Invalid LINE signature');
  }

  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    throw new Error('Invalid LINE signature');
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
