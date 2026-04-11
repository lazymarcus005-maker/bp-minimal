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
  console.info('[line] fetching message content', { messageId });
  const response = await fetch(`https://api-data.line.me/v2/bot/message/${encodeURIComponent(messageId)}/content`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${getLineChannelAccessToken()}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('[line] failed to fetch message content', {
      messageId,
      status: response.status,
      statusText: response.statusText,
      body: text,
    });
    throw new LineRequestError(`Failed to fetch LINE message content: ${response.status} ${text}`, 502);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const mimeType = (response.headers.get('content-type') || 'image/jpeg').split(';')[0];

  console.info('[line] fetched message content', {
    messageId,
    mimeType,
    byteLength: bytes.length,
  });

  if (!mimeType.startsWith('image/')) {
    console.error('[line] message content is not an image', { messageId, mimeType });
    throw new LineRequestError(`LINE content is not an image: ${mimeType}`, 400);
  }

  return { bytes, mimeType };
}

export async function replyLineText(replyToken: string, text: string): Promise<void> {
  console.info('[line] replying to message', { replyTokenSuffix: replyToken.slice(-6), textPreview: text.slice(0, 80) });
  const response = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getLineChannelAccessToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      replyToken,
      messages: [
        {
          type: 'text',
          text,
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error('[line] failed to reply message', {
      replyTokenSuffix: replyToken.slice(-6),
      status: response.status,
      statusText: response.statusText,
      body,
    });
    throw new LineRequestError(`Failed to reply LINE message: ${response.status} ${body}`, 502);
  }

  console.info('[line] reply sent', { replyTokenSuffix: replyToken.slice(-6) });
}
