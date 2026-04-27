import { ArrowLeft, BarChart3, List } from "lucide-react";
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

export default async function AccountDetailPage({ params }: { params: Params }) {
  const { accountId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const accounts = await listAccountsWithBalances(user.id);
  const account = accounts.find((a) => a.id === accountId);
  if (!account) notFound();

  const typeLabel = ACCOUNT_TYPES.find((t) => t.value === account.type)?.label ?? account.type;

  const { items: recent } = await searchTransactions(user.id, { accountIds: [accountId] }, 0);

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

      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-medium">Últimas transações</h2>
          <Link
            href={`/extrato?account=${account.id}`}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            Ver todas
          </Link>
        </div>
        <TransactionsList items={recent.slice(0, 15)} />
      </section>
    </div>
  );
}
