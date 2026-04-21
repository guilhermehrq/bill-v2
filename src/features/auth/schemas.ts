import { z } from "zod";

export const emailSchema = z.string().email("Email inválido");
export const passwordSchema = z.string().min(8, "Mínimo 8 caracteres");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe sua senha"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome"),
  email: emailSchema,
  password: passwordSchema,
  terms: z.literal(true, {
    errorMap: () => ({ message: "Você precisa aceitar os termos" }),
  }),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const resetPasswordSchema = z.object({
  email: emailSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const updatePasswordSchema = z
  .object({
    password: passwordSchema,
    confirm: passwordSchema,
  })
  .refine((data) => data.password === data.confirm, {
    message: "Senhas não conferem",
    path: ["confirm"],
  });
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
