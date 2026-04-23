import { z } from "zod";

export const createAccountSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome"),
  type: z.enum(["checking", "savings", "cash", "investment", "other"]),
  institution: z.string().trim().optional().or(z.literal("")),
  initialBalanceCents: z.number().int().finite(),
  color: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i, "Cor inválida")
    .optional(),
  icon: z.string().trim().optional(),
});
export type CreateAccountInput = z.infer<typeof createAccountSchema>;

export const updateAccountSchema = createAccountSchema.partial();
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

// Form-level schema: the UI collects the balance as a pt-BR string
// ("1.234,56") that is converted to cents at submit. Using the server
// schema directly as resolver would fail validation silently.
export const accountFormSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome"),
  type: z.enum(["checking", "savings", "cash", "investment", "other"]),
  institution: z.string().optional().or(z.literal("")),
  initialBalanceReais: z.string(),
  color: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i, "Cor inválida")
    .optional(),
  icon: z.string().optional(),
});
export type AccountFormValues = z.infer<typeof accountFormSchema>;
