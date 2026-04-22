import { z } from "zod";

export const upsertBudgetSchema = z.object({
  categoryId: z.string().uuid(),
  month: z.string().regex(/^\d{4}-\d{2}-01$/, "Mês inválido"),
  amountCents: z.number().int().positive("Valor precisa ser maior que zero"),
});
export type UpsertBudgetInput = z.infer<typeof upsertBudgetSchema>;

export const copyBudgetsSchema = z.object({
  fromMonth: z.string().regex(/^\d{4}-\d{2}-01$/, "Mês origem inválido"),
  toMonth: z.string().regex(/^\d{4}-\d{2}-01$/, "Mês destino inválido"),
});
export type CopyBudgetsInput = z.infer<typeof copyBudgetsSchema>;
