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

export const bulkUpsertBudgetsSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}-01$/, "Mês inválido"),
  entries: z
    .array(
      z.object({
        categoryId: z.string().uuid(),
        // amountCents = 0 means delete the budget for that category in this month.
        amountCents: z.number().int().min(0, "Valor inválido"),
      }),
    )
    .min(1, "Informe ao menos uma categoria"),
});
export type BulkUpsertBudgetsInput = z.infer<typeof bulkUpsertBudgetsSchema>;
