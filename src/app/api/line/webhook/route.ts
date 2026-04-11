import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertLineSignature, fetchLineMessageImage, LineRequestError, replyLineText } from '@/lib/line';
import { determineTargetMimeType, resizeAndEncodeImage } from '@/lib/image';
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
        replyToken: z.string(),
        timestamp: z.number().optional(),
        source: z
          .object({
            type: z.string().optional(),
            userId: z.string().optional(),
            groupId: z.string().optional(),
            roomId: z.string().optional(),
          })
          .optional(),
        message: z.union([
          z.object({
            type: z.literal('image'),
            id: z.string(),
          }),
          z.object({
            type: z.literal('text'),
            id: z.string(),
            text: z.string().optional(),
          }),
        ]),
      })
    )
    .default([]),
});

function buildReadingSummaryText(data: {
  systolic: number;
  diastolic: number;
  pulse: number | null | undefined;
  measuredAt: string | null | undefined;
}): string {
  const lines = [
    'สรุปค่าที่จะบันทึก',
    `SYS: ${data.systolic} mmHg`,
    `DIA: ${data.diastolic} mmHg`,
  ];

  if (data.pulse !== null && data.pulse !== undefined) {
    lines.push(`PULSE: ${data.pulse} bpm`);
  }

  if (data.measuredAt) {
    lines.push(`TIME: ${data.measuredAt}`);
  }

  return lines.join('\n');
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    console.info('[line-webhook] received request', {
      contentType: req.headers.get('content-type'),
      bodyLength: rawBody.length,
    });
    assertLineSignature(req, rawBody);

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      throw new LineRequestError('Invalid JSON body', 400);
    }

    const payload = lineWebhookSchema.parse(parsedBody);

    console.info('[line-webhook] parsed payload', {
      eventCount: payload.events.length,
      eventTypes: payload.events.map((event) => event.message.type),
    });

    const supabase = getSupabaseAdmin();
    const errors: Array<{ messageId: string; error: string }> = [];
    let saved = 0;

    for (const event of payload.events) {
      const messageId = event.message.id;
      try {
        console.info('[line-webhook] processing event', {
          messageId,
          messageType: event.message.type,
          sourceType: event.source?.type ?? null,
        });

        if (event.message.type === 'text') {
          await replyLineText(event.replyToken, 'ได้รับข้อความแล้ว กรุณาส่งรูปเครื่องวัดความดันหรือผลความดันที่เห็นตัวเลขชัดเจน');
          continue;
        }

        const { bytes, mimeType } = await fetchLineMessageImage(messageId);
        const imageBase64 = await resizeAndEncodeImage(bytes, mimeType);
        const extractionMimeType = determineTargetMimeType(mimeType);

        console.info('[line-webhook] image prepared for extraction', {
          messageId,
          mimeType,
          extractionMimeType,
          resizedBase64Length: imageBase64.length,
        });

        const { result, raw } = await extractReadingFromImage({
          mimeType: extractionMimeType,
          base64: imageBase64,
        });

        console.info('[line-webhook] extraction result', {
          messageId,
          systolic: result.systolic,
          diastolic: result.diastolic,
          pulse: result.pulse,
          confidence: result.confidence,
        });

        if (result.systolic === null || result.diastolic === null) {
          const missingFields = [
            result.systolic === null ? 'systolic' : null,
            result.diastolic === null ? 'diastolic' : null,
          ]
            .filter(Boolean)
            .join(', ');
          throw new Error(`Missing required blood pressure value(s): ${missingFields}`);
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
          console.error('[line-webhook] supabase insert failed', {
            messageId,
            error: error.message,
          });
          throw new Error(error.message);
        }

        console.info('[line-webhook] reading saved', {
          messageId,
          saved,
          systolic: reading.systolic,
          diastolic: reading.diastolic,
        });

        await replyLineText(
          event.replyToken,
          buildReadingSummaryText({
            systolic: reading.systolic,
            diastolic: reading.diastolic,
            pulse: reading.pulse,
            measuredAt: reading.measured_at,
          })
        );

        saved += 1;
      } catch (error) {
        console.error('[line-webhook] event failed', {
          messageId,
          messageType: event.message.type,
          error: error instanceof Error ? error.message : 'Unknown processing error',
        });

        if (event.message.type === 'image') {
          try {
            await replyLineText(
              event.replyToken,
              'ไม่สามารถอ่านค่าจากรูปนี้ได้ กรุณาถ่ายใหม่ให้เห็นหน้าจอชัดเจน แสงเพียงพอ และถ่ายตรงไม่เอียง'
            );
          } catch {
            // Ignore reply errors to preserve primary processing error
          }
        }

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
    if (error instanceof LineRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : 'Unknown LINE webhook error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
