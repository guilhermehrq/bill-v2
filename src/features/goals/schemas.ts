import { z } from "zod";

export const createGoalSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome"),
  targetCents: z.number().int().positive("Valor alvo precisa ser maior que zero"),
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
    .nullable()
    .optional(),
  accountId: z.string().uuid().nullable().optional(),
  icon: z.string().trim().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i, "Cor inválida")
    .optional(),
});
export type CreateGoalInput = z.infer<typeof createGoalSchema>;

export const updateGoalSchema = createGoalSchema.partial();
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;

export const contributeGoalSchema = z.object({
  goalId: z.string().uuid(),
  amountCents: z.number().int().positive("Valor precisa ser maior que zero"),
});
export type ContributeGoalInput = z.infer<typeof contributeGoalSchema>;
