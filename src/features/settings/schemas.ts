import { z } from "zod";

export const updateSettingsSchema = z.object({
  creditCardReportMode: z.enum(["invoice_date", "purchase_date", "installment_date"]).optional(),
  statementViewMode: z.enum(["cashflow", "all_entries"]).optional(),
  theme: z.enum(["system", "light", "dark"]).optional(),
  density: z.enum(["comfortable", "compact"]).optional(),
  budgetAlertThresholds: z
    .array(z.number().int().min(1, "Mínimo 1%").max(200, "Máximo 200%"))
    .max(10, "Máximo 10 alertas")
    .optional(),
  showBudgetForecasts: z.boolean().optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
