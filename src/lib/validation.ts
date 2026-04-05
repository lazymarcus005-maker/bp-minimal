import { z } from 'zod';

export const saveReadingSchema = z
  .object({
    systolic: z.coerce.number().int().min(40).max(300),
    diastolic: z.coerce.number().int().min(20).max(200),
    pulse: z
      .union([z.coerce.number().int().min(20).max(250), z.literal(''), z.null()])
      .transform((value) => (value === '' || value === null ? null : value)),
    measured_at: z
      .string()
      .optional()
      .transform((value) => (value && value.trim().length > 0 ? value : null)),
    notes: z
      .string()
      .optional()
      .transform((value) => (value && value.trim().length > 0 ? value : null)),
    confidence: z
      .union([z.coerce.number().min(0).max(1), z.literal(''), z.null(), z.undefined()])
      .transform((value) => (value === '' || value == null ? null : value)),
    extracted_json: z.any().optional(),
    image_base64: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.systolic <= data.diastolic) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Systolic must be greater than diastolic',
        path: ['systolic'],
      });
    }
  });

export type SaveReadingInput = z.infer<typeof saveReadingSchema>;
