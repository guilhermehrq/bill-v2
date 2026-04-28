import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getUserSettings, type StatementViewMode } from "@/features/settings/queries";
import { type TransactionFilters } from "@/features/transactions/list-queries";
import { listFormAccountOptions, listFormCategoryOptions } from "@/features/transactions/queries";
import { loadStatement } from "@/features/transactions/statement-data";
import { StatementModeToggle } from "@/features/transactions/statement-mode-toggle";
import { StatementTotalsBar } from "@/features/transactions/statement-totals";
import { TransactionFilters as FiltersBar } from "@/features/transactions/transaction-filters";
import { TransactionsList } from "@/features/transactions/transactions-list";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Extrato · FinPessoal" };

type SearchParams = Promise<{
  month?: string;
  q?: string;
  account?: string;
  category?: string;
  type?: string;
  from?: string;
  to?: string;
  page?: string;
  modo?: string;
}>;

const VALID_MODES: StatementViewMode[] = ["cashflow", "all_entries"];

export default async function ExtratoPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const settings = await getUserSettings(user.id);
  const requestedMode = VALID_MODES.includes(params.modo as StatementViewMode)
    ? (params.modo as StatementViewMode)
    : null;
  const mode: StatementViewMode = requestedMode ?? settings.statementViewMode;

  const { from, to } = resolvePeriod(params);
  const filters: TransactionFilters = {
    from,
    to,
    search: params.q,
    accountIds: params.account ? [params.account] : undefined,
    categoryIds: params.category ? [params.category] : undefined,
    types: params.type ? ([params.type] as TransactionFilters["types"]) : undefined,
    mode,
  };

  const page = params.page ? Math.max(0, Number(params.page) - 1) : 0;

  const [accounts, categories, statement] = await Promise.all([
    listFormAccountOptions(user.id),
    listFormCategoryOptions(user.id),
    loadStatement(user.id, filters, page),
  ]);

  const currentPage = page + 1;
  const buildPageLink = (targetPage: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    qs.set("page", String(targetPage));
    return `/extrato?${qs.toString()}`;
  };

  return (
    <div className="space-y-4 py-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Extrato</h1>
          <p className="text-muted-foreground text-sm">
            {statement.total === 0
              ? "Nada por aqui ainda."
              : `${statement.total} ${statement.total === 1 ? "lançamento" : "lançamentos"} no filtro atual`}
          </p>
        </div>
        <StatementModeToggle current={mode} defaultMode={settings.statementViewMode} />
      </header>

      <FiltersBar accounts={accounts} categories={categories} />

      <TransactionsList items={statement.items} />

      {(statement.hasMore || currentPage > 1) && (
        <Card className="flex items-center justify-between p-3">
          {currentPage > 1 ? (
            <Link
              href={buildPageLink(currentPage - 1)}
              className="border-input bg-background hover:bg-accent inline-flex items-center rounded-md border px-3 py-1.5 text-sm"
            >
              ← Anterior
            </Link>
          ) : (
            <Button variant="outline" size="sm" disabled>
              ← Anterior
            </Button>
          )}
          <span className="text-muted-foreground text-xs">Página {currentPage}</span>
          {statement.hasMore ? (
            <Link
              href={buildPageLink(currentPage + 1)}
              className="border-input bg-background hover:bg-accent inline-flex items-center rounded-md border px-3 py-1.5 text-sm"
            >
              Próxima →
            </Link>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Próxima →
            </Button>
          )}
        </Card>
      )}

      <StatementTotalsBar totals={statement.totals} />
    </div>
  );
}

function resolvePeriod(params: { month?: string; from?: string; to?: string }): {
  from: string;
  to: string;
} {
  if (params.from && params.to) return { from: params.from, to: params.to };

  const now = new Date();
  const month =
    params.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y!, m! - 1, 1);
  const last = new Date(y!, m!, 0);
  return {
    from: toISO(first),
    to: toISO(last),
  };
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
