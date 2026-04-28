"use client";

import { Receipt } from "lucide-react";
import Link from "next/link";
import { AccountIcon } from "@/components/ui/account-icon";
import { format } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { InvoiceListItem } from "./statement-data";

const STATUS_LABELS: Record<InvoiceListItem["status"], string> = {
  open: "aberta",
  closed: "fechada",
  paid: "paga",
  overdue: "vencida",
  partial: "parcial",
};

const STATUS_TONE: Record<InvoiceListItem["status"], string> = {
  open: "text-info",
  closed: "text-pending",
  paid: "text-income",
  overdue: "text-expense",
  partial: "text-pending",
};

const MONTH_NAMES = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

export function InvoiceRow({ invoice: inv }: { invoice: InvoiceListItem }) {
  const [y, m] = inv.referenceMonth.split("-").map(Number) as [number, number, number];
  const monthLabel = `${MONTH_NAMES[m - 1] ?? ""}/${String(y).slice(-2)}`;
  const isPaid = inv.status === "paid";
  const valueLabel = isPaid ? format(inv.totalCents) : format(inv.remainingCents);

  return (
    <Link
      href={`/cartoes/${inv.cardId}?mes=${inv.referenceMonth.slice(0, 7)}`}
      className="hover:bg-accent/40 group flex items-center gap-3 px-3 py-2.5"
    >
      <span className="flex shrink-0 items-center gap-1">
        <AccountIcon icon={inv.cardIcon} color={inv.cardColor} size="sm" />
        <span
          className="bg-muted text-muted-foreground inline-flex size-6 items-center justify-center rounded-full"
          aria-hidden
        >
          <Receipt className="size-3" />
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          Fatura {inv.cardName} <span className="text-muted-foreground">{monthLabel}</span>
        </p>
        <p className="text-muted-foreground truncate text-xs">
          <span className={cn("font-medium", STATUS_TONE[inv.status])}>
            {STATUS_LABELS[inv.status]}
          </span>
          {!isPaid && inv.paidCents > 0 && (
            <>
              {" "}
              · {format(inv.paidCents)} já pago de {format(inv.totalCents)}
            </>
          )}
          <> · vence {formatDate(inv.date)}</>
        </p>
      </div>
      <p className={cn("tabular shrink-0 text-sm font-semibold", isPaid ? "text-income" : "")}>
        {isPaid ? "+ " : "− "}
        {valueLabel}
      </p>
    </Link>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y!.slice(-2)}`;
}
