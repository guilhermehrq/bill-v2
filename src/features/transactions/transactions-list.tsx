"use client";

import { format as formatDateFns, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { format } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { TransactionListItem } from "./list-queries";
import { TransactionRow } from "./transaction-row";

type Props = {
  items: TransactionListItem[];
};

type DayGroup = {
  date: string;
  items: TransactionListItem[];
  totalCents: number;
};

export function TransactionsList({ items }: Props) {
  const groups = useMemo(() => groupByDay(items), [items]);

  if (items.length === 0) {
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
                : `${group.totalCents > 0 ? "+" : "-"} ${format(Math.abs(group.totalCents))}`}
            </span>
          </div>
          <Card className="divide-y overflow-hidden p-0">
            {group.items.map((t) => (
              <TransactionRow key={t.id} transaction={t} />
            ))}
          </Card>
        </section>
      ))}
    </div>
  );
}

function groupByDay(items: TransactionListItem[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const t of items) {
    const existing = map.get(t.date) ?? { date: t.date, items: [], totalCents: 0 };
    existing.items.push(t);
    existing.totalCents += signedAmount(t);
    map.set(t.date, existing);
  }
  return Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
}

function signedAmount(t: TransactionListItem): number {
  if (t.type === "income") return t.amountCents;
  if (t.type === "expense") return -t.amountCents;
  if (t.type === "transfer") {
    if (t.transferDirection === "in") return t.amountCents;
    if (t.transferDirection === "out") return -t.amountCents;
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
