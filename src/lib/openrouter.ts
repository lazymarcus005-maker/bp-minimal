import { z } from 'zod';
import { getOptionalEnv, getRequiredEnv } from '@/lib/env';

export const extractionSchema = z.object({
  systolic: z.number().int().min(40).max(300).nullable(),
  diastolic: z.number().int().min(20).max(200).nullable(),
  pulse: z.number().int().min(20).max(250).nullable(),
  measured_at: z.string().nullable(),
  confidence: z.number().min(0).max(1).nullable(),
  notes: z.string().nullable(),
});

const jsonSchema = {
  name: 'bp_reading',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      systolic: { type: ['integer', 'null'] },
      diastolic: { type: ['integer', 'null'] },
      pulse: { type: ['integer', 'null'] },
      measured_at: {
        type: ['string', 'null'],
        description: 'Full date and time only if clearly visible in image, else null',
      },
      confidence: { type: ['number', 'null'] },
      notes: { type: ['string', 'null'] },
    },
    required: ['systolic', 'diastolic', 'pulse', 'measured_at', 'confidence', 'notes'],
    additionalProperties: false,
  },
} as const;

export type ExtractionResult = z.infer<typeof extractionSchema>;

export async function extractReadingFromImage(input: { mimeType: string; base64: string }) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getRequiredEnv('OPENROUTER_API_KEY')}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': getOptionalEnv('OPENROUTER_REFERER', 'http://localhost:3000'),
      'X-Title': getOptionalEnv('OPENROUTER_TITLE', 'BP Reader'),
    },
    body: JSON.stringify({
      model: getOptionalEnv('OPENROUTER_MODEL', 'google/gemini-2.5-flash'),
      messages: [
        {
          role: 'system',
          content:
            'You are a blood pressure reading extraction engine. Read the image and return JSON only. Do not guess values unless visually supported. If a field is not visible, return null. If measured_at is not clearly visible as a full date and time, return null.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                'Extract systolic, diastolic, pulse, measured_at, confidence, and notes from this image. If measured_at is not clearly visible as a full date and time, return null. Do not guess. confidence should be between 0 and 1.',
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${input.mimeType};base64,${input.base64}`,
              },
            },
          ],
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: jsonSchema,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter error: ${response.status} ${text}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenRouter returned an empty response');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('OpenRouter response was not valid JSON');
  }

  const result = extractionSchema.parse(parsed);

  if (
    result.systolic !== null &&
    result.diastolic !== null &&
    result.systolic <= result.diastolic
  ) {
    throw new Error('Invalid reading: systolic must be greater than diastolic');
  }

  return {
    result,
    raw: parsed,
  };
}