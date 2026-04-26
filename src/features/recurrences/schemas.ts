import { z } from "zod";

export const createRecurrenceSchema = z
  .object({
    description: z.string().trim().min(1, "Informe a descrição"),
    amountCents: z.number().int().positive("Valor precisa ser maior que zero"),
    type: z.enum(["income", "expense"]),
    categoryId: z.string().uuid().nullable().optional(),
    accountId: z.string().uuid().nullable().optional(),
    creditCardId: z.string().uuid().nullable().optional(),
    frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
    interval: z.number().int().min(1).max(24).default(1),
    dayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
    dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
      .nullable()
      .optional(),
    maxOccurrences: z.number().int().positive().nullable().optional(),
    lastGeneratedDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
      .nullable()
      .optional(),
  })
  .refine((d) => Boolean(d.accountId) !== Boolean(d.creditCardId), {
    message: "Escolha uma conta ou um cartão (não os dois)",
    path: ["accountId"],
  });
export type CreateRecurrenceInput = z.infer<typeof createRecurrenceSchema>;

export const updateRecurrenceSchema = createRecurrenceSchema.innerType().partial();
export type UpdateRecurrenceInput = z.infer<typeof updateRecurrenceSchema>;
