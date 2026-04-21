import { LoginForm } from "@/features/auth/login-form";

export const metadata = { title: "Entrar · FinPessoal" };

export default function LoginPage() {
  return (
    <>
      <h1 className="sr-only">Entrar</h1>
      <LoginForm />
    </>
  );
}
