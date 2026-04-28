"use client";

import { format as formatDateFns, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { format } from "@/lib/money";
import { cn } from "@/lib/utils";
import { InvoiceRow } from "./invoice-row";
import type { TransactionListItem } from "./list-queries";
import type { StatementItem, TxListItem } from "./statement-data";
import { TransactionRow } from "./transaction-row";

type Props = {
  // Accepts both legacy (TransactionListItem[]) and the new mixed StatementItem[].
  items: TransactionListItem[] | StatementItem[];
};

type DayGroup = {
  date: string;
  items: StatementItem[];
  totalCents: number;
};

function isStatementItem(x: TransactionListItem | StatementItem): x is StatementItem {
  return "kind" in x;
}

export function TransactionsList({ items }: Props) {
  const normalized = useMemo<StatementItem[]>(
    () =>
      items.map((it) =>
        isStatementItem(it) ? it : ({ ...it, kind: "transaction" } satisfies TxListItem),
      ),
    [items],
  );

  const groups = useMemo(() => groupByDay(normalized), [normalized]);

  if (normalized.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground text-sm">Nenhuma transação para os filtros atuais.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section key={group.date}>
          <div className="mb-1 flex items-baseline justify-between px-1">
            <h3 className="text-xs font-semibold tracking-wider uppercase">
              {formatDayHeader(group.date)}
            </h3>
            <span
              className={cn(
                "tabular text-muted-foreground text-xs",
                group.totalCents > 0 && "text-income",
                group.totalCents < 0 && "text-expense",
              )}
            >
              {group.totalCents === 0
                ? "0,00"
                : `${group.totalCents > 0 ? "+" : "−"} ${format(Math.abs(group.totalCents))}`}
            </span>
          </div>
          <Card className="divide-y overflow-hidden p-0">
            {group.items.map((it) =>
              it.kind === "invoice" ? (
                <InvoiceRow key={`inv:${it.id}`} invoice={it} />
              ) : (
                <TransactionRow key={`tx:${it.id}`} transaction={it} />
              ),
            )}
          </Card>
        </section>
      ))}
    </div>
  );
}

function groupByDay(items: StatementItem[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const it of items) {
    const existing = map.get(it.date) ?? { date: it.date, items: [], totalCents: 0 };
    existing.items.push(it);
    existing.totalCents += signedAmount(it);
    map.set(it.date, existing);
  }
  return Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
}

function signedAmount(it: StatementItem): number {
  if (it.kind === "invoice") {
    return it.status === "paid" ? 0 : -it.remainingCents;
  }
  if (it.type === "income") return it.amountCents;
  if (it.type === "expense") return -it.amountCents;
  if (it.type === "transfer") {
    if (it.transferDirection === "in") return it.amountCents;
    if (it.transferDirection === "out") return -it.amountCents;
  }
  return 0;
}

function formatDayHeader(isoDate: string): string {
  const date = parseISO(isoDate);
  const full = formatDateFns(date, "dd 'de' MMMM · EEEE", { locale: ptBR });
  return full.replace(
    /^([0-9]{2} de )([a-zá-ú])/i,
    (_, prefix, letter) => prefix + letter.toUpperCase(),
  );
}
