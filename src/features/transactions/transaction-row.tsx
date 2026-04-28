"use client";

import {
  ArrowRight,
  ArrowRightLeft,
  Check,
  CircleDashed,
  CircleHelp,
  MoreHorizontal,
  Pencil,
  Trash2,
  Undo2,
} from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { AccountIcon } from "@/components/ui/account-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getIconComponent } from "@/lib/icons";
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

  const isTransfer = t.type === "transfer";
  const isNegative = t.type === "expense" || (isTransfer && t.transferDirection === "out");
  const isPositive = t.type === "income" || (isTransfer && t.transferDirection === "in");

  const amountSign = isTransfer ? "" : isNegative ? "−" : isPositive ? "+" : "";
  const amountClass = isTransfer
    ? "text-foreground"
    : isNegative
      ? "text-expense"
      : isPositive
        ? "text-income"
        : "text-foreground";
  const amountLabel = `${amountSign}${amountSign ? " " : ""}${format(t.amountCents)}`;

  const installmentSuffix =
    t.installmentNumber && t.installmentTotal
      ? ` (${t.installmentNumber}/${t.installmentTotal})`
      : "";

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
    <div className={cn("hover:bg-accent/40 group flex items-center gap-3 px-3 py-2.5")}>
      <button
        type="button"
        onClick={() => openEdit(t.id)}
        className="flex flex-1 items-center gap-3 text-left outline-hidden"
      >
        {isTransfer ? <TransferGlyph t={t} /> : <CategoryGlyph t={t} />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-medium">
              {t.description}
              {installmentSuffix && (
                <span className="text-muted-foreground ml-1 text-xs font-normal">
                  {installmentSuffix}
                </span>
              )}
            </p>
            <StatusIcon t={t} />
          </div>
          <p className="text-muted-foreground truncate text-xs">{describeMeta(t, sourceLabel)}</p>
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
          {!isTransfer && (
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

function CategoryGlyph({ t }: { t: TransactionListItem }) {
  const iconName = t.category?.icon ?? t.category?.parentIcon ?? null;
  const color = t.category?.parentColor ?? t.category?.color ?? "#6366f1";
  const Icon = getIconComponent(iconName) ?? CircleHelp;
  return (
    <span
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border"
      style={{ borderColor: `${color}40`, color, backgroundColor: `${color}1a` }}
      aria-hidden
    >
      <Icon className="size-4" />
    </span>
  );
}

function TransferGlyph({ t }: { t: TransactionListItem }) {
  // We render the IN row by default — `t.account` is the destination, `t.pairAccount` is the
  // source. When showing OUT rows (filtered by source), reverse.
  const isOut = t.transferDirection === "out";
  const from = isOut ? t.account : t.pairAccount;
  const to = isOut ? t.pairAccount : t.account;

  if (!from && !to) {
    return (
      <span className="bg-muted text-muted-foreground inline-flex size-9 shrink-0 items-center justify-center rounded-md border">
        <ArrowRightLeft className="size-4" />
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1" aria-label="Transferência">
      <AccountIcon icon={from?.icon ?? null} color={from?.color ?? null} size="sm" />
      <ArrowRight className="text-muted-foreground size-3 shrink-0" aria-hidden />
      <AccountIcon icon={to?.icon ?? null} color={to?.color ?? null} size="sm" />
    </span>
  );
}

function StatusIcon({ t }: { t: TransactionListItem }) {
  if (t.type === "transfer") return null;
  if (t.isPaid) {
    return (
      <span className="text-income inline-flex shrink-0" title="Efetivada" aria-label="Efetivada">
        <Check className="size-3.5" aria-hidden />
      </span>
    );
  }
  return (
    <span className="text-pending inline-flex shrink-0" title="Prevista" aria-label="Prevista">
      <CircleDashed className="size-3.5" aria-hidden />
    </span>
  );
}

function describeMeta(t: TransactionListItem, source: string | null): string {
  if (t.type === "transfer") {
    const isOut = t.transferDirection === "out";
    const from = isOut ? t.account : t.pairAccount;
    const to = isOut ? t.pairAccount : t.account;
    if (from && to) return `${from.name} → ${to.name}`;
    if (source) return source;
    return "Transferência";
  }

  const cat = t.category
    ? t.category.parentName
      ? `${t.category.parentName} › ${t.category.name}`
      : t.category.name
    : "Sem categoria";

  return source ? `${cat} · ${source}` : cat;
}
