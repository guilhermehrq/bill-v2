import { z } from "zod";

const baseFields = {
  description: z.string().trim().min(1, "Informe a descrição"),
  amountCents: z.number().int().positive("Valor precisa ser maior que zero"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  notes: z.string().trim().optional().or(z.literal("")),
  tags: z.array(z.string().trim().min(1)).default([]),
};

export const createIncomeOrExpenseSchema = z
  .object({
    type: z.enum(["income", "expense"]),
    accountId: z.string().uuid().nullable().optional(),
    creditCardId: z.string().uuid().nullable().optional(),
    categoryId: z.string().uuid().nullable().optional(),
    invoiceId: z.string().uuid().nullable().optional(),
    isPaid: z.boolean().default(true),
    installmentTotal: z.number().int().min(1).max(24).optional(),
    ...baseFields,
  })
  .refine((d) => Boolean(d.accountId) !== Boolean(d.creditCardId), {
    message: "Escolha uma conta ou um cartão (não os dois)",
    path: ["accountId"],
  })
  .refine(
    (d) =>
      !d.installmentTotal ||
      d.installmentTotal === 1 ||
      (d.type === "expense" && Boolean(d.creditCardId)),
    {
      message: "Parcelamento só vale para despesas no cartão",
      path: ["installmentTotal"],
    },
  );
export type CreateIncomeOrExpenseInput = z.infer<typeof createIncomeOrExpenseSchema>;

export const createTransferSchema = z
  .object({
    type: z.literal("transfer"),
    sourceAccountId: z.string().uuid(),
    destinationAccountId: z.string().uuid(),
    ...baseFields,
  })
  .refine((d) => d.sourceAccountId !== d.destinationAccountId, {
    message: "Origem e destino precisam ser diferentes",
    path: ["destinationAccountId"],
  });
export type CreateTransferInput = z.infer<typeof createTransferSchema>;

export type CreateTransactionInput = CreateIncomeOrExpenseInput | CreateTransferInput;

export const updateTransactionSchema = z.object({
  description: z.string().trim().min(1).optional(),
  amountCents: z.number().int().positive().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  accountId: z.string().uuid().nullable().optional(),
  creditCardId: z.string().uuid().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  isPaid: z.boolean().optional(),
  notes: z.string().trim().nullable().optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
});
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
