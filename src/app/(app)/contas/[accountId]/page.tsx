import { ArrowLeft, BarChart3, ChevronLeft, ChevronRight, List } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AccountIcon } from "@/components/ui/account-icon";
import { Card } from "@/components/ui/card";
import { listAccountsWithBalances } from "@/features/accounts/queries";
import { ACCOUNT_TYPES } from "@/features/accounts/types";
import { searchTransactions } from "@/features/transactions/list-queries";
import { TransactionsList } from "@/features/transactions/transactions-list";
import { format } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Conta · FinPessoal" };

type Params = Promise<{ accountId: string }>;
type SearchParams = Promise<{ mes?: string }>;

export default async function AccountDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { accountId } = await params;
  const { mes } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const accounts = await listAccountsWithBalances(user.id);
  const account = accounts.find((a) => a.id === accountId);
  if (!account) notFound();

  const typeLabel = ACCOUNT_TYPES.find((t) => t.value === account.type)?.label ?? account.type;

  const monthKey = isValidMonthKey(mes) ? mes! : currentMonthKey();
  const { from, to } = monthRange(monthKey);
  const monthLabel = formatMonthLabel(monthKey);

  const { items: recent, total } = await searchTransactions(
    user.id,
    { accountIds: [accountId], from, to },
    0,
  );

  const isNegative = account.balanceCents < 0;

  return (
    <div className="space-y-6 py-4">
      <Link
        href="/contas"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" />
        Voltar para contas
      </Link>

      <Card className="flex flex-col gap-4 p-5">
        <div className="flex items-start gap-4">
          <AccountIcon icon={account.icon} color={account.color} size="lg" />
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">{account.name}</h1>
            <p className="text-muted-foreground text-sm">
              {typeLabel}
              {account.institution ? ` · ${account.institution}` : ""}
              {account.archived && " · arquivada"}
              {!account.includeInTotalBalance && " · fora do saldo total"}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground text-xs uppercase">Saldo atual</p>
            <p className={`tabular text-3xl font-semibold ${isNegative ? "text-expense" : ""}`}>
              {format(account.balanceCents)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase">Saldo inicial</p>
            <p className="tabular text-lg">{format(account.initialBalanceCents)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase">Transações</p>
            <p className="text-lg">{account.transactionCount}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href={`/extrato?account=${account.id}`}
          className="border-input hover:bg-accent bg-background flex items-start gap-3 rounded-md border p-3 transition-colors"
        >
          <List className="text-muted-foreground mt-0.5 size-5" aria-hidden />
          <span className="flex flex-col">
            <span className="text-sm font-medium">Ver no extrato</span>
            <span className="text-muted-foreground text-xs">Filtrar lançamentos desta conta</span>
          </span>
        </Link>
        <Link
          href="/relatorios"
          className="border-input hover:bg-accent bg-background flex items-start gap-3 rounded-md border p-3 transition-colors"
        >
          <BarChart3 className="text-muted-foreground mt-0.5 size-5" aria-hidden />
          <span className="flex flex-col">
            <span className="text-sm font-medium">Ver relatórios</span>
            <span className="text-muted-foreground text-xs">Categorias, evolução, comparativo</span>
          </span>
        </Link>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-medium">Transações de {monthLabel}</h2>
          <Link
            href={`/extrato?account=${account.id}`}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            Ver no extrato
          </Link>
        </div>

        <div className="flex items-center gap-1">
          <Link
            href={`/contas/${account.id}?mes=${prevMonthKey(monthKey)}`}
            aria-label="Mês anterior"
            className="hover:bg-accent inline-flex size-9 items-center justify-center rounded-md"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <span className="tabular px-3 text-sm font-medium">{monthLabel}</span>
          <Link
            href={`/contas/${account.id}?mes=${nextMonthKey(monthKey)}`}
            aria-label="Próximo mês"
            className="hover:bg-accent inline-flex size-9 items-center justify-center rounded-md"
          >
            <ChevronRight className="size-4" />
          </Link>
          <span className="text-muted-foreground ml-2 text-xs">
            {total} {total === 1 ? "transação" : "transações"}
          </span>
        </div>

        {recent.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground text-sm">Nenhuma transação em {monthLabel}.</p>
          </Card>
        ) : (
          <TransactionsList items={recent} />
        )}
      </section>
    </div>
  );
}

function isValidMonthKey(value: string | undefined): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}$/.test(value);
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthRange(monthKey: string): { from: string; to: string } {
  const [y, m] = monthKey.split("-").map(Number) as [number, number];
  const last = new Date(y, m, 0).getDate();
  return {
    from: `${monthKey}-01`,
    to: `${monthKey}-${String(last).padStart(2, "0")}`,
  };
}

function prevMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number) as [number, number];
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number) as [number, number];
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number) as [number, number];
  const names = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  return `${names[m - 1]} ${y}`;
}
