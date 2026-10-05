import { z } from 'zod';
import { successEnvelope } from './envelope.js';

export const ROLES = ['STUDENT', 'INSTRUCTOR', 'COORDINATOR'] as const;
export const roleSchema = z.enum(ROLES);
export type Role = z.infer<typeof roleSchema>;

export const accountSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string(),
  role: roleSchema,
  programId: z.uuid().nullable(),
});
export type AccountDetails = z.infer<typeof accountSchema>;

// The identity state every request resolves to (ADR 0001).
export const currentIdentitySchema = z.discriminatedUnion('state', [
  z.object({ state: z.literal('guest') }),
  z.object({ state: z.literal('registering'), email: z.string() }),
  z.object({ state: z.literal('active'), account: accountSchema }),
  z.object({ state: z.literal('deactivated') }),
]);
export type CurrentIdentity = z.infer<typeof currentIdentitySchema>;

export const getCurrentAccountContract = {
  method: 'GET' as const,
  path: '/accounts/get-current' as const,
  response: successEnvelope(currentIdentitySchema),
};

const nameSchema = z
  .string()
  .trim()
  .min(1, 'Enter your name.')
  .max(255, 'Name is too long.');

export const registerInputSchema = z.object({
  name: nameSchema,
  programId: z.uuid().nullable().optional(),
});
export type RegisterInput = z.infer<typeof registerInputSchema>;

export const registerAccountContract = {
  method: 'POST' as const,
  path: '/accounts/register' as const,
  body: registerInputSchema,
  response: successEnvelope(accountSchema),
};

export const updateOwnProfileInputSchema = z.object({
  name: nameSchema,
  programId: z.uuid().nullable(),
});
export type UpdateOwnProfileInput = z.infer<typeof updateOwnProfileInputSchema>;

export const updateOwnProfileContract = {
  method: 'POST' as const,
  path: '/accounts/update-own-profile' as const,
  body: updateOwnProfileInputSchema,
  response: successEnvelope(accountSchema),
};
