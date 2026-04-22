import { z } from "zod";

export const createCardSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome"),
  brand: z.string().trim().optional().or(z.literal("")),
  lastDigits: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "Informe 4 dígitos")
    .optional()
    .or(z.literal("")),
  limitCents: z.number().int().nonnegative("Limite inválido"),
  closingDay: z.number().int().min(1).max(31),
  dueDay: z.number().int().min(1).max(31),
  defaultAccountId: z.string().uuid().nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i, "Cor inválida")
    .optional(),
  icon: z.string().trim().optional(),
});
export type CreateCardInput = z.infer<typeof createCardSchema>;

export const updateCardSchema = createCardSchema.partial();
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
