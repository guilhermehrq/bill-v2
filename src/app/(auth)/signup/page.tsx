import { SignupForm } from "@/features/auth/signup-form";

export const metadata = { title: "Criar conta · FinPessoal" };

export default function SignupPage() {
  return (
    <>
      <h1 className="sr-only">Criar conta</h1>
      <SignupForm />
    </>
  );
}
