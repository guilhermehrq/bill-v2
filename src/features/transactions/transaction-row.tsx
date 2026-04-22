"use client";

import { Check, MoreHorizontal, Pencil, Trash2, Undo2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "@/lib/money";
import { cn } from "@/lib/utils";
import { deleteTransactionAction, togglePaidAction } from "./actions";
import type { TransactionListItem } from "./list-queries";
import { useTransactionDrawer } from "./transaction-drawer-store";

type Props = {
  transaction: TransactionListItem;
};

export function TransactionRow({ transaction: t }: Props) {
  const [isPending, startTransition] = useTransition();
  const openEdit = useTransactionDrawer((s) => s.openEdit);

  const isNegative =
    t.type === "expense" || (t.type === "transfer" && t.transferDirection === "out");
  const isPositive = t.type === "income" || (t.type === "transfer" && t.transferDirection === "in");

  const amountLabel = `${isNegative ? "-" : isPositive ? "+" : ""} ${format(t.amountCents)}`.trim();
  const amountClass = isNegative
    ? "text-expense"
    : isPositive && t.type === "income"
      ? "text-income"
      : "text-foreground";

  const categoryLabel = t.category
    ? t.category.parentName
      ? `${t.category.parentName} › ${t.category.name}`
      : t.category.name
    : t.type === "transfer"
      ? "Transferência"
      : "Sem categoria";

  const sourceLabel = t.account?.name ?? t.card?.name ?? null;

  function handleTogglePaid() {
    startTransition(async () => {
      const result = await togglePaidAction(t.id, !t.isPaid);
      if (result.ok) {
        toast.success(t.isPaid ? "Marcado como previsto" : "Marcado como pago");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete() {
    if (!confirm(`Excluir "${t.description}"?`)) return;
    startTransition(async () => {
      const result = await deleteTransactionAction(t.id);
      if (result.ok) {
        toast.success("Transação excluída");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div
      className={cn(
        "hover:bg-accent/40 group flex items-center gap-3 px-3 py-2",
        !t.isPaid && "opacity-60",
      )}
    >
      <button
        type="button"
        onClick={() => openEdit(t.id)}
        className="flex flex-1 items-center gap-3 text-left outline-hidden"
      >
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{
            backgroundColor: t.category?.color ?? t.account?.color ?? t.card?.color ?? "#6366f1",
          }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{t.description}</p>
          <p className="text-muted-foreground truncate text-xs">
            {categoryLabel}
            {sourceLabel && ` · ${sourceLabel}`}
            {!t.isPaid && " · previsto"}
          </p>
        </div>
        <p className={cn("tabular shrink-0 text-sm font-semibold", amountClass)}>{amountLabel}</p>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="hover:bg-accent rounded-md p-1 opacity-0 outline-hidden group-hover:opacity-100 data-[state=open]:opacity-100"
          aria-label="Ações"
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => openEdit(t.id)} disabled={isPending}>
            <Pencil /> Editar
          </DropdownMenuItem>
          {t.type !== "transfer" && (
            <DropdownMenuItem onClick={handleTogglePaid} disabled={isPending}>
              {t.isPaid ? (
                <>
                  <Undo2 /> Marcar como previsto
                </>
              ) : (
                <>
                  <Check /> Marcar como pago
                </>
              )}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleDelete} disabled={isPending}>
            <Trash2 /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
