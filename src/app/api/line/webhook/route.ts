import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertLineSignature, fetchLineMessageImage } from '@/lib/line';
import { resizeAndEncodeImage } from '@/lib/image';
import { extractReadingFromImage } from '@/lib/openrouter';
import { getReadingsTable, getSupabaseAdmin } from '@/lib/supabase';
import { saveReadingSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const maxDuration = 60;

const lineWebhookSchema = z.object({
  events: z
    .array(
      z.object({
        type: z.literal('message'),
        timestamp: z.number().optional(),
        source: z
          .object({
            type: z.string().optional(),
            userId: z.string().optional(),
            groupId: z.string().optional(),
            roomId: z.string().optional(),
          })
          .optional(),
        message: z.object({
          type: z.literal('image'),
          id: z.string(),
        }),
      })
    )
    .default([]),
});

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    assertLineSignature(req, rawBody);

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const payload = lineWebhookSchema.parse(parsedBody);

    const supabase = getSupabaseAdmin();
    const errors: Array<{ messageId: string; error: string }> = [];
    let saved = 0;

    for (const event of payload.events) {
      const messageId = event.message.id;
      try {
        const { bytes, mimeType } = await fetchLineMessageImage(messageId);
        const imageBase64 = await resizeAndEncodeImage(bytes, mimeType);
        const extractionMimeType =
          mimeType === 'image/png' || mimeType === 'image/webp' ? mimeType : 'image/jpeg';

        const { result, raw } = await extractReadingFromImage({
          mimeType: extractionMimeType,
          base64: imageBase64,
        });

        if (result.systolic === null || result.diastolic === null) {
          throw new Error('Missing systolic or diastolic from extraction');
        }

        const reading = saveReadingSchema.parse({
          systolic: result.systolic,
          diastolic: result.diastolic,
          pulse: result.pulse,
          measured_at: result.measured_at,
          notes: result.notes,
          confidence: result.confidence,
          extracted_json: {
            raw,
            line_message_id: messageId,
            line_timestamp: event.timestamp ?? null,
            line_source_type: event.source?.type ?? null,
          },
          image_base64: imageBase64,
        });

        const { error } = await supabase.from(getReadingsTable()).insert(reading);

        if (error) {
          throw new Error(error.message);
        }

        saved += 1;
      } catch (error) {
        errors.push({
          messageId,
          error: error instanceof Error ? error.message : 'Unknown processing error',
        });
      }
    }

    return NextResponse.json({
      ok: true,
      processed: payload.events.length,
      saved,
      failed: errors.length,
      errors,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown LINE webhook error';
    const status =
      message === 'Missing LINE signature' || message === 'Invalid LINE signature'
        ? 401
        : message.includes('required environment variable')
          ? 500
          : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
