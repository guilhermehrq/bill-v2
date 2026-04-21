import { ResetPasswordForm } from "@/features/auth/reset-password-form";

export const metadata = { title: "Recuperar senha · FinPessoal" };

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="mb-4 text-lg font-semibold">Recuperar senha</h1>
      <p className="text-muted-foreground mb-4 text-sm">
        Informe seu email para receber o link de redefinição.
      </p>
      <ResetPasswordForm />
    </>
  );
}
