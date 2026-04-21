import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { logoutAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const displayName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    user.email ||
    "visitante";

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Olá, {displayName}</h1>
          <p className="text-muted-foreground text-sm">
            Fase 1 — auth concluído, shell em construção.
          </p>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="outline">
            Sair
          </Button>
        </form>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Próximos passos</CardTitle>
          <CardDescription>O que vem pela frente no desenvolvimento</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>• Fase 1.6 — shell autenticado (sidebar + topbar + bottom nav mobile)</p>
          <p>• Fase 2 — CRUD de contas, categorias e transações</p>
          <p>• Fase 3 — cartões de crédito e faturas</p>
          <p>• Fase 2.5 — importador de Organizze (pós-MVP)</p>
        </CardContent>
      </Card>
    </main>
  );
}
