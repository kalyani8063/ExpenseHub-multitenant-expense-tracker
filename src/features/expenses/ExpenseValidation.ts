import { z } from 'zod';

// Only the user-controlled fields are validated here.
// `organizationId` and `ownerId` are deliberately absent: they are derived from
// the Clerk session in `getExpenseTenant`, never from the submitted form.
export const CreateExpenseValidation = z.object({
  amount: z
    .string()
    .trim()
    .regex(/^\d{1,10}(?:\.\d{1,2})?$/),
  category: z.string().trim().min(1).max(64),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform(value => (value || null)),
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(value => !Number.isNaN(new Date(value).getTime())),
});

export type CreateExpenseInput = z.infer<typeof CreateExpenseValidation>;

export const DeleteExpenseValidation = z.object({
  id: z.coerce.number().int().positive(),
});
