"use client";

import { ChevronLeft, ChevronRight, Copy } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { copyBudgetsFromMonthAction } from "./actions";
import { BudgetForm } from "./budget-form";
import { BudgetProgressRow } from "./budget-progress-row";
import type { BudgetRow, BudgetsOverview } from "./queries";

type Props = {
  overview: BudgetsOverview;
  categoryOptions: Array<{ id: string; name: string; parentName: string | null }>;
  previousMonth: string;
  previousMonthHasData: boolean;
  creditCardModeShort: string;
};

export function BudgetsView({
  overview,
  categoryOptions,
  previousMonth,
  previousMonthHasData,
  creditCardModeShort,
}: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetRow | null>(null);
  const [isCopying, startCopy] = useTransition();

  const monthLabel = formatMonth(overview.month);
  const daysLeft = Math.max(0, overview.daysInMonth - overview.daysElapsed);
  const totalAvailable = Math.max(0, overview.totalBudgetedCents - overview.totalSpentCents);
  const totalPct =
    overview.totalBudgetedCents > 0
      ? (overview.totalSpentCents / overview.totalBudgetedCents) * 100
      : 0;

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(b: BudgetRow) {
    setEditing(b);
    setFormOpen(true);
  }

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Orçamentos — {monthLabel}</h1>
          <p className="text-muted-foreground text-sm">
            Cartão: {creditCardModeShort} ·{" "}
            {overview.daysElapsed >= overview.daysInMonth
              ? "mês encerrado"
              : `${daysLeft} ${daysLeft === 1 ? "dia restante" : "dias restantes"}`}
          </p>
        </div>
        <div className="flex gap-2">
          {previousMonthHasData && (
            <Button variant="outline" onClick={handleCopy} disabled={isCopying}>
              <Copy className="mr-2 size-4" />
              {isCopying ? "Copiando..." : "Copiar mês anterior"}
            </Button>
          )}
          <Button onClick={openNew}>+ Novo orçamento</Button>
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

      {overview.budgets.length > 0 && (
        <Card className="space-y-3 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-muted-foreground text-xs uppercase">Resumo do mês</p>
            <p className="text-muted-foreground tabular text-xs">
              {Math.round(totalPct)}% · {overview.daysElapsed}/{overview.daysInMonth} dias
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs uppercase">Orçado</p>
              <p className="tabular font-semibold">{formatMoney(overview.totalBudgetedCents)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase">Gasto</p>
              <p className="tabular font-semibold">{formatMoney(overview.totalSpentCents)}</p>
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

      {overview.budgets.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground text-sm">Nenhum orçamento para {monthLabel}.</p>
          <div className="mt-3 flex justify-center gap-2">
            {previousMonthHasData && (
              <Button variant="outline" onClick={handleCopy} disabled={isCopying}>
                Copiar do mês anterior
              </Button>
            )}
            <Button onClick={openNew}>Criar primeiro</Button>
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
              onEdit={() => openEdit(b)}
            />
          ))}
        </Card>
      )}

      {overview.unbudgetedCategoryNames.length > 0 && overview.budgets.length > 0 && (
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

      <BudgetForm
        open={formOpen}
        onOpenChange={setFormOpen}
        month={overview.month}
        existing={editing}
        categoryOptions={categoryOptions}
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
