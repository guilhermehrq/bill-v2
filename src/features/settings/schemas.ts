import { z } from "zod";

export const updateSettingsSchema = z.object({
  creditCardReportMode: z.enum(["invoice_date", "purchase_date", "installment_date"]).optional(),
  statementViewMode: z.enum(["cashflow", "all_entries"]).optional(),
  theme: z.enum(["system", "light", "dark"]).optional(),
  density: z.enum(["comfortable", "compact"]).optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
