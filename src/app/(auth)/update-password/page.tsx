import { UpdatePasswordForm } from "@/features/auth/update-password-form";

export const metadata = { title: "Nova senha · FinPessoal" };

export default function UpdatePasswordPage() {
  return (
    <>
      <h1 className="mb-4 text-lg font-semibold">Definir nova senha</h1>
      <UpdatePasswordForm />
    </>
  );
}
