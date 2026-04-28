"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { format } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { StatementTotals as Totals } from "./statement-data";

type Props = {
  totals: Totals;
};

export function StatementTotalsBar({ totals }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (totals.mode === "all_entries") {
    const totalClass =
      totals.totalCents > 0 ? "text-income" : totals.totalCents < 0 ? "text-expense" : "";
    return (
      <Bar>
        <div className="grid grid-cols-3 gap-3">
          <Slot label="Receitas" value={format(totals.incomeCents)} tone="income" />
          <Slot label="Despesas" value={format(totals.expenseCents)} tone="expense" />
          <Slot label="Total" value={format(totals.totalCents)} className={totalClass} />
        </div>
      </Bar>
    );
  }

  // cashflow
  const currentClass = totals.currentBalanceCents < 0 ? "text-expense" : "";
  const forecastClass = totals.forecastBalanceCents < 0 ? "text-expense" : "";

  return (
    <Bar>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Slot
            label="Saldo atual"
            value={format(totals.currentBalanceCents)}
            className={currentClass}
          />
          <Slot
            label="Previsão"
            value={format(totals.forecastBalanceCents)}
            className={forecastClass}
          />
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="text-muted-foreground hover:text-foreground flex w-full items-center justify-center gap-1 text-xs"
        >
          {expanded ? "Recolher detalhes" : "Ver detalhes"}
          <ChevronDown
            className={cn("size-3 transition-transform", expanded && "rotate-180")}
            aria-hidden
          />
        </button>

        {expanded && (
          <div className="grid grid-cols-2 gap-3 border-t pt-3 sm:grid-cols-3">
            <Slot label="Saldo anterior" value={format(totals.previousBalanceCents)} size="sm" />
            <Slot
              label="Receita realizada"
              value={format(totals.realizedIncomeCents)}
              tone="income"
              size="sm"
            />
            <Slot
              label="Receita prevista"
              value={format(totals.forecastedIncomeCents)}
              size="sm"
              muted
            />
            <Slot
              label="Despesa realizada"
              value={format(totals.realizedExpenseCents)}
              tone="expense"
              size="sm"
            />
            <Slot
              label="Despesa prevista"
              value={format(totals.forecastedExpenseCents)}
              size="sm"
              muted
            />
          </div>
        )}
      </div>
    </Bar>
  );
}

function Bar({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background/95 sticky bottom-16 z-30 border-t backdrop-blur lg:bottom-0">
      <div className="mx-auto w-full max-w-6xl px-4 py-3 md:px-6">{children}</div>
    </div>
  );
}

function Slot({
  label,
  value,
  tone,
  size = "default",
  muted,
  className,
}: {
  label: string;
  value: string;
  tone?: "income" | "expense";
  size?: "sm" | "default";
  muted?: boolean;
  className?: string;
}) {
  const valueSizeClass = size === "sm" ? "text-sm" : "text-lg";
  const toneClass = tone === "income" ? "text-income" : tone === "expense" ? "text-expense" : "";
  return (
    <div className={cn("flex flex-col gap-0.5", muted && "opacity-70")}>
      <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
        {label}
      </span>
      <span className={cn("tabular font-semibold", valueSizeClass, toneClass, className)}>
        {value}
      </span>
    </div>
  );
}
