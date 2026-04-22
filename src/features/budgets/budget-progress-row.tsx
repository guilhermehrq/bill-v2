"use client";

import { AlertTriangle, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "@/lib/money";
import { cn } from "@/lib/utils";
import { deleteBudgetAction } from "./actions";
import type { BudgetRow } from "./queries";

type Props = {
  budget: BudgetRow;
  daysElapsed: number;
  daysInMonth: number;
  onEdit: () => void;
};

export function BudgetProgressRow({ budget, daysElapsed, daysInMonth, onEdit }: Props) {
  const [isPending, startTransition] = useTransition();

  const pct = budget.pctUsed;
  const remainingCents = Math.max(0, budget.amountCents - budget.spentCents);
  const overCents = Math.max(0, budget.spentCents - budget.amountCents);

  // Linear projection based on days elapsed.
  const projectedCents =
    daysElapsed > 0 && daysElapsed < daysInMonth
      ? Math.round((budget.spentCents / daysElapsed) * daysInMonth)
      : budget.spentCents;
  const willOverrun = projectedCents > budget.amountCents;
  const projectedOver = Math.max(0, projectedCents - budget.amountCents);

  const state: "safe" | "attention" | "warning" | "over" =
    pct > 100 ? "over" : pct >= 90 ? "warning" : pct >= 70 ? "attention" : "safe";

  const barColor =
    state === "over"
      ? "bg-expense"
      : state === "warning"
        ? "bg-pending"
        : state === "attention"
          ? "bg-amber-400"
          : "bg-income";

  function handleDelete() {
    if (!confirm(`Excluir orçamento de "${budget.categoryName}"?`)) return;
    startTransition(async () => {
      const result = await deleteBudgetAction(budget.id);
      if (result.ok) toast.success("Orçamento excluído");
      else toast.error(result.error);
    });
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: budget.categoryColor ?? "#6366f1" }}
          aria-hidden
        />
        <p className="flex-1 truncate text-sm font-medium">
          {budget.parentName
            ? `${budget.parentName} › ${budget.categoryName}`
            : budget.categoryName}
        </p>
        {state === "over" && (
          <span className="text-expense flex items-center gap-1 text-xs font-medium">
            <AlertTriangle className="size-3" /> Estourado
          </span>
        )}
        {state === "warning" && <span className="text-pending text-xs font-medium">Atenção</span>}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="hover:bg-accent rounded-md p-1 outline-hidden"
            aria-label="Ações"
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit} disabled={isPending}>
              <Pencil /> Editar valor
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={handleDelete} disabled={isPending}>
              <Trash2 /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="bg-secondary h-2 w-full overflow-hidden rounded-full">
        <div
          className={cn("h-full transition-all", barColor)}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <p className="text-muted-foreground tabular text-xs">
        {format(budget.spentCents)} de {format(budget.amountCents)} · {Math.round(pct)}%{" "}
        {state === "over"
          ? `· excesso de ${format(overCents)}`
          : `· ${format(remainingCents)} disponível`}
        {willOverrun && state !== "over" && (
          <span className="text-pending">
            {" "}
            · ritmo projetado {format(projectedCents)} (estouro de {format(projectedOver)})
          </span>
        )}
      </p>
    </div>
  );
}
