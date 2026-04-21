import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const displayName =
    (typeof user?.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    user?.email ||
    "visitante";

  return (
    <div className="space-y-6 py-4">
      <header>
        <h1 className="text-2xl font-semibold">Olá, {displayName} 👋</h1>
        <p className="text-muted-foreground text-sm">
          Fase 1 concluída — auth, schema, RLS e shell autenticado no ar.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Próximas fases</CardTitle>
            <CardDescription>Roadmap do desenvolvimento</CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-1 text-sm">
            <p>• Fase 2 — contas, categorias, transações, dashboard</p>
            <p>• Fase 3 — cartões e faturas</p>
            <p>• Fase 4 — orçamentos, recorrências, metas</p>
            <p>• Fase 5 — relatórios, investimentos, polish</p>
            <p>• Fase 2.5 — importador Organizze (pós-MVP)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status atual</CardTitle>
            <CardDescription>O que funciona hoje</CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-1 text-sm">
            <p>✓ 13 tabelas no Postgres com RLS</p>
            <p>✓ Triggers de fatura e purchase_date</p>
            <p>✓ Signup / login / reset / OAuth Google</p>
            <p>✓ Shell com sidebar, topbar e bottom nav</p>
            <p>✓ Teste de isolamento multi-tenant passando</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
