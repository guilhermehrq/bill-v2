import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CashflowChart } from "@/features/dashboard/cashflow-chart";
import { CategoryDonut } from "@/features/dashboard/category-donut";
import { KpiCard } from "@/features/dashboard/kpi-card";
import { loadDashboard } from "@/features/dashboard/queries";
import { UpcomingList } from "@/features/dashboard/upcoming-list";
import { CreditCardModeSelector } from "@/features/settings/credit-card-mode-selector";
import { getUserSettings } from "@/features/settings/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Dashboard · FinPessoal" };

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const displayName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    user.email ||
    "visitante";

  const settings = await getUserSettings(user.id);
  const data = await loadDashboard(user.id, settings.creditCardReportMode);

  const incomeDelta = data.currentMonth.incomeCents - data.previousMonth.incomeCents;
  const expenseDelta = data.currentMonth.expenseCents - data.previousMonth.expenseCents;

  if (data.activeAccountCount === 0) {
    return <EmptyState name={displayName} />;
  }

  return (
    <div className="space-y-6 py-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Olá, {displayName} 👋</h1>
          <p className="text-muted-foreground text-sm">Visão geral do mês atual.</p>
        </div>
        <CreditCardModeSelector currentMode={settings.creditCardReportMode} />
      </header>

      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          label="Saldo total"
          valueCents={data.totalBalanceCents}
          href="/contas"
          hint={
            data.activeAccountCount === 1
              ? "1 conta ativa"
              : `${data.activeAccountCount} contas ativas`
          }
        />
        <KpiCard
          label="Fatura acumulada"
          valueCents={data.openInvoicesTotalCents}
          tone={data.openInvoicesTotalCents > 0 ? "expense" : "neutral"}
          href="/cartoes"
          hint={
            data.openInvoicesCount === 0
              ? "Sem faturas em aberto"
              : data.openInvoicesCount === 1
                ? "1 fatura em aberto"
                : `${data.openInvoicesCount} faturas em aberto`
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard
          label="Receitas do mês"
          valueCents={data.currentMonth.incomeCents}
          tone="income"
          deltaCents={incomeDelta}
          deltaLabel="vs. mês anterior"
        />
        <KpiCard
          label="Despesas do mês"
          valueCents={data.currentMonth.expenseCents}
          tone="expense"
          deltaCents={expenseDelta}
          deltaLabel="vs. mês anterior"
        />
        <KpiCard label="Saldo do mês" valueCents={data.currentMonth.netCents} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fluxo de caixa</CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <CashflowChart data={data.cashflow} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Despesas por categoria</CardTitle>
            <CardDescription>Mês atual</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryDonut data={data.expensesByCategory} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Próximos 7 dias</CardTitle>
          <CardDescription>Transações previstas para vencer</CardDescription>
        </CardHeader>
        <CardContent>
          <UpcomingList items={data.upcoming} />
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState({ name }: { name: string }) {
  return (
    <div className="space-y-6 py-4">
      <header>
        <h1 className="text-2xl font-semibold">Bem-vindo, {name} 👋</h1>
        <p className="text-muted-foreground text-sm">Vamos configurar sua primeira conta.</p>
      </header>
      <Card className="mx-auto max-w-md text-center">
        <CardHeader>
          <CardTitle>Sua primeira conta</CardTitle>
          <CardDescription>
            Crie uma conta para começar a registrar transações. As 40 categorias padrão em português
            serão criadas junto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/contas"
            className="bg-brand text-brand-foreground hover:bg-brand/90 inline-flex items-center rounded-md px-4 py-2 text-sm font-medium"
          >
            Criar conta
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
