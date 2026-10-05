import { z } from 'zod';

export const metaSchema = z.object({ requestId: z.string() });
export type Meta = z.infer<typeof metaSchema>;

export const successEnvelope = <T extends z.ZodType>(data: T) =>
  z.object({ data, meta: metaSchema });

export const errorEnvelopeSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
  meta: metaSchema,
});
export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;
