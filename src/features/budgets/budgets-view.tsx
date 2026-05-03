"use client";

import { ChevronLeft, ChevronRight, Copy, FilePlus, ListPlus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreditCardModeSelector } from "@/features/settings/credit-card-mode-selector";
import type { CreditCardReportMode } from "@/features/settings/queries";
import { updateUserSettingsAction } from "@/features/settings/actions";
import { copyBudgetsFromMonthAction } from "./actions";
import { BudgetAlertSettings } from "./budget-alert-settings";
import { BudgetTreeDialog, type BudgetTreeCategory } from "./budget-tree-dialog";
import { BudgetProgressRow } from "./budget-progress-row";
import type { BudgetsOverview } from "./queries";

type Props = {
  overview: BudgetsOverview;
  categoryTree: BudgetTreeCategory[];
  previousMonth: string;
  previousMonthHasData: boolean;
  creditCardMode: CreditCardReportMode;
  showForecasts: boolean;
  budgetAlertThresholds: number[];
};

export function BudgetsView({
  overview,
  categoryTree,
  previousMonth,
  previousMonthHasData,
  creditCardMode,
  showForecasts,
  budgetAlertThresholds,
}: Props) {
  const [treeOpen, setTreeOpen] = useState(false);
  const [isCopying, startCopy] = useTransition();
  const [isToggling, startToggle] = useTransition();
  const router = useRouter();

  const monthLabel = formatMonth(overview.month);
  const daysLeft = Math.max(0, overview.daysInMonth - overview.daysElapsed);
  const totalAvailable = Math.max(0, overview.totalBudgetedCents - overview.totalSpentCents);
  const totalPct =
    overview.totalBudgetedCents > 0
      ? (overview.totalSpentCents / overview.totalBudgetedCents) * 100
      : 0;

  const existingByCategoryId = Object.fromEntries(
    overview.budgets.map((b) => [b.categoryId, b.amountCents]),
  );

  function handleCopy() {
    startCopy(async () => {
      const result = await copyBudgetsFromMonthAction({
        fromMonth: previousMonth,
        toMonth: overview.month,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.data.copied === 0
          ? "Nada para copiar do mês anterior"
          : `${result.data.copied} orçamentos copiados`,
      );
    });
  }

  function handleToggleForecasts(next: boolean) {
    startToggle(async () => {
      const result = await updateUserSettingsAction({ showBudgetForecasts: next });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  const isEmpty = overview.budgets.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Orçamentos — {monthLabel}</h1>
          <p className="text-muted-foreground text-sm">
            {overview.daysElapsed >= overview.daysInMonth
              ? "mês encerrado"
              : `${daysLeft} ${daysLeft === 1 ? "dia restante" : "dias restantes"}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CreditCardModeSelector currentMode={creditCardMode} />
          {!isEmpty && (
            <Button onClick={() => setTreeOpen(true)}>
              <ListPlus className="mr-2 size-4" /> Definir orçamentos
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Link
          href={`/orcamentos?mes=${prevMonthKey(overview.month)}`}
          aria-label="Mês anterior"
          className="hover:bg-accent inline-flex size-9 items-center justify-center rounded-md"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <span className="tabular px-3 text-sm font-medium">{monthLabel}</span>
        <Link
          href={`/orcamentos?mes=${nextMonthKey(overview.month)}`}
          aria-label="Próximo mês"
          className="hover:bg-accent inline-flex size-9 items-center justify-center rounded-md"
        >
          <ChevronRight className="size-4" />
        </Link>
      </div>

      {!isEmpty && (
        <Card className="space-y-3 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-muted-foreground text-xs uppercase">Resumo do mês</p>
            <div className="flex items-center gap-3">
              <label className="text-muted-foreground flex cursor-pointer items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={showForecasts}
                  disabled={isToggling}
                  onChange={(e) => handleToggleForecasts(e.target.checked)}
                  className="size-3.5"
                />
                <Sparkles className="size-3" />
                <span>Incluir previsões</span>
              </label>
              <p className="text-muted-foreground tabular text-xs">
                {Math.round(totalPct)}% · {overview.daysElapsed}/{overview.daysInMonth} dias
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs uppercase">Orçado</p>
              <p className="tabular font-semibold">{formatMoney(overview.totalBudgetedCents)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase">
                {showForecasts ? "Gasto + previsto" : "Gasto"}
              </p>
              <p className="tabular font-semibold">{formatMoney(overview.totalSpentCents)}</p>
              {showForecasts && overview.totalForecastCents > 0 && (
                <p className="text-muted-foreground/80 text-[11px]">
                  inclui {formatMoney(overview.totalForecastCents)} a vencer
                </p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase">Disponível</p>
              <p className="tabular font-semibold">{formatMoney(totalAvailable)}</p>
            </div>
          </div>
          <div className="bg-secondary h-2 w-full overflow-hidden rounded-full">
            <div className="bg-brand h-full" style={{ width: `${Math.min(100, totalPct)}%` }} />
          </div>
        </Card>
      )}

      {isEmpty ? (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground text-sm">
            Nenhum orçamento para {monthLabel}. Como prefere começar?
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setTreeOpen(true)}
              className="hover:bg-accent flex flex-col items-center gap-2 rounded-md border p-4 text-center"
            >
              <FilePlus className="text-brand size-6" />
              <span className="text-sm font-medium">Definir do zero</span>
              <span className="text-muted-foreground text-xs">
                Lista todas as categorias para você dar um limite a cada uma.
              </span>
            </button>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!previousMonthHasData || isCopying}
              className="hover:bg-accent flex flex-col items-center gap-2 rounded-md border p-4 text-center disabled:opacity-50"
            >
              <Copy className="text-brand size-6" />
              <span className="text-sm font-medium">
                {isCopying ? "Copiando..." : "Copiar mês anterior"}
              </span>
              <span className="text-muted-foreground text-xs">
                {previousMonthHasData
                  ? "Repete os mesmos limites do mês passado."
                  : "Sem orçamentos no mês passado para copiar."}
              </span>
            </button>
          </div>
        </Card>
      ) : (
        <Card className="space-y-4 p-4">
          {overview.budgets.map((b) => (
            <BudgetProgressRow
              key={b.id}
              budget={b}
              daysElapsed={overview.daysElapsed}
              daysInMonth={overview.daysInMonth}
              onEdit={() => setTreeOpen(true)}
            />
          ))}
        </Card>
      )}

      {overview.unbudgetedCategoryNames.length > 0 && !isEmpty && (
        <Card className="p-4">
          <p className="text-muted-foreground text-xs">
            Sem orçamento em {overview.unbudgetedCategoryNames.length}{" "}
            {overview.unbudgetedCategoryNames.length === 1 ? "categoria" : "categorias"}:{" "}
            {overview.unbudgetedCategoryNames.slice(0, 6).join(", ")}
            {overview.unbudgetedCategoryNames.length > 6 &&
              ` e mais ${overview.unbudgetedCategoryNames.length - 6}`}
            .
          </p>
        </Card>
      )}

      <BudgetAlertSettings thresholds={budgetAlertThresholds} />

      <BudgetTreeDialog
        open={treeOpen}
        onOpenChange={setTreeOpen}
        month={overview.month}
        monthLabel={monthLabel}
        categories={categoryTree}
        existingByCategoryId={existingByCategoryId}
      />
    </div>
  );
}

function formatMonth(month: string): string {
  const [y, m] = month.split("-").map(Number) as [number, number, number];
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

function prevMonthKey(month: string): string {
  const [y, m] = month.split("-").map(Number) as [number, number, number];
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextMonthKey(month: string): string {
  const [y, m] = month.split("-").map(Number) as [number, number, number];
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}
