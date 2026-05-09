"use client";

import { AlertTriangle, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getIconComponent } from "@/lib/icons";
import { format } from "@/lib/money";
import { cn } from "@/lib/utils";
import { deleteBudgetAction } from "./actions";
import type { BudgetGroup, BudgetRow } from "./queries";

type Props = {
  group: BudgetGroup;
  daysElapsed: number;
  daysInMonth: number;
  onEdit: () => void;
};

type RowState = "safe" | "attention" | "warning" | "over";

export function BudgetGroupCard({ group, daysElapsed, daysInMonth, onEdit }: Props) {
  const hasChildren = group.children.length > 0;

  return (
    <Card className="space-y-0 overflow-hidden p-0">
      <ParentRow
        group={group}
        daysElapsed={daysElapsed}
        daysInMonth={daysInMonth}
        onEdit={onEdit}
        hasChildren={hasChildren}
      />
      {hasChildren && (
        <div className="border-t">
          {group.children.map((child, i) => (
            <ChildRow
              key={child.id}
              budget={child}
              daysElapsed={daysElapsed}
              daysInMonth={daysInMonth}
              onEdit={onEdit}
              divider={i > 0}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function ParentRow({
  group,
  daysElapsed,
  daysInMonth,
  onEdit,
  hasChildren,
}: {
  group: BudgetGroup;
  daysElapsed: number;
  daysInMonth: number;
  onEdit: () => void;
  hasChildren: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const Icon = getIconComponent(group.parentCategoryIcon);
  const color = group.parentCategoryColor ?? "#6366f1";

  const amount = group.budgetedCents;
  const spent = group.spentCents;
  const pct = group.pctUsed;
  const remaining = Math.max(0, amount - spent);
  const overCents = Math.max(0, spent - amount);
  const projected =
    daysElapsed > 0 && daysElapsed < daysInMonth
      ? Math.round((spent / daysElapsed) * daysInMonth)
      : spent;
  const willOverrun = projected > amount;
  const projectedOver = Math.max(0, projected - amount);
  const state: RowState =
    pct > 100 ? "over" : pct >= 90 ? "warning" : pct >= 70 ? "attention" : "safe";
  const barColor = barColorFor(state);

  function handleDelete() {
    if (!group.parentRow) return;
    if (!confirm(`Excluir orçamento de "${group.parentCategoryName}"?`)) return;
    startTransition(async () => {
      const result = await deleteBudgetAction(group.parentRow!.id);
      if (result.ok) toast.success("Orçamento excluído");
      else toast.error(result.error);
    });
  }

  const childrenSum = group.children.reduce((s, c) => s + c.amountCents, 0);

  return (
    <div className="space-y-1 p-3">
      <div className="flex items-center gap-2">
        <span
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border"
          style={{ borderColor: `${color}40`, color, backgroundColor: `${color}1a` }}
          aria-hidden
        >
          {Icon ? (
            <Icon className="size-3.5" />
          ) : (
            <span className="block size-2 rounded-full" style={{ backgroundColor: color }} />
          )}
        </span>
        <div className="flex-1 truncate">
          <p className="truncate text-sm font-medium">{group.parentCategoryName}</p>
          {hasChildren && (
            <p className="text-muted-foreground text-[11px]">
              {group.parentRow
                ? `${format(group.parentRow.amountCents)} no pai · ${format(childrenSum)} em ${group.children.length} ${group.children.length === 1 ? "subcategoria" : "subcategorias"}`
                : `${format(childrenSum)} em ${group.children.length} ${group.children.length === 1 ? "subcategoria" : "subcategorias"}`}
            </p>
          )}
        </div>
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
            {group.parentRow && (
              <DropdownMenuItem variant="destructive" onClick={handleDelete} disabled={isPending}>
                <Trash2 /> Excluir orçamento do pai
              </DropdownMenuItem>
            )}
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
        {format(spent)} de {format(amount)} · {Math.round(pct)}%{" "}
        {state === "over"
          ? `· excesso de ${format(overCents)}`
          : `· ${format(remaining)} disponível`}
        {willOverrun && state !== "over" && (
          <span className="text-pending">
            {" "}
            · ritmo projetado {format(projected)} (estouro de {format(projectedOver)})
          </span>
        )}
      </p>
    </div>
  );
}

function ChildRow({
  budget,
  daysElapsed,
  daysInMonth,
  onEdit,
  divider,
}: {
  budget: BudgetRow;
  daysElapsed: number;
  daysInMonth: number;
  onEdit: () => void;
  divider: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const Icon = getIconComponent(budget.categoryIcon);
  const color = budget.categoryColor ?? "#6366f1";

  const pct = budget.pctUsed;
  const remaining = Math.max(0, budget.amountCents - budget.spentCents);
  const overCents = Math.max(0, budget.spentCents - budget.amountCents);
  const projected =
    daysElapsed > 0 && daysElapsed < daysInMonth
      ? Math.round((budget.spentCents / daysElapsed) * daysInMonth)
      : budget.spentCents;
  const willOverrun = projected > budget.amountCents;
  const projectedOver = Math.max(0, projected - budget.amountCents);
  const state: RowState =
    pct > 100 ? "over" : pct >= 90 ? "warning" : pct >= 70 ? "attention" : "safe";
  const barColor = barColorFor(state);

  function handleDelete() {
    if (!confirm(`Excluir orçamento de "${budget.categoryName}"?`)) return;
    startTransition(async () => {
      const result = await deleteBudgetAction(budget.id);
      if (result.ok) toast.success("Orçamento excluído");
      else toast.error(result.error);
    });
  }

  return (
    <div className={cn("space-y-1 px-3 py-2 pl-9", divider && "border-t")}>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs">└─</span>
        <span
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-md border"
          style={{ borderColor: `${color}40`, color, backgroundColor: `${color}1a` }}
          aria-hidden
        >
          {Icon ? (
            <Icon className="size-3" />
          ) : (
            <span className="block size-1.5 rounded-full" style={{ backgroundColor: color }} />
          )}
        </span>
        <p className="text-muted-foreground flex-1 truncate text-sm">{budget.categoryName}</p>
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
      <div className="bg-secondary ml-9 h-1.5 w-[calc(100%-2.25rem)] overflow-hidden rounded-full">
        <div
          className={cn("h-full transition-all", barColor)}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <p className="text-muted-foreground tabular ml-9 text-[11px]">
        {format(budget.spentCents)} de {format(budget.amountCents)} · {Math.round(pct)}%{" "}
        {state === "over"
          ? `· excesso de ${format(overCents)}`
          : `· ${format(remaining)} disponível`}
        {willOverrun && state !== "over" && (
          <span className="text-pending">
            {" "}
            · ritmo projetado {format(projected)} (estouro de {format(projectedOver)})
          </span>
        )}
      </p>
    </div>
  );
}

function barColorFor(state: RowState): string {
  return state === "over"
    ? "bg-expense"
    : state === "warning"
      ? "bg-pending"
      : state === "attention"
        ? "bg-amber-400"
        : "bg-income";
}
