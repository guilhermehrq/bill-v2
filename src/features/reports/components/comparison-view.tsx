import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { format as formatMoney } from "@/lib/money";
import type { CategoryRow, ComparisonData } from "../queries";

type Props = {
  data: ComparisonData;
  periodLabel: string;
  previousLabel: string;
};

export function ComparisonView({ data, periodLabel, previousLabel }: Props) {
  const incomeDelta = data.current.summary.incomeCents - data.previous.summary.incomeCents;
  const expenseDelta = data.current.summary.expenseCents - data.previous.summary.expenseCents;
  const netDelta = data.current.summary.netCents - data.previous.summary.netCents;

  const merged = mergeCategories(data.current.byCategory, data.previous.byCategory);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <DeltaCard
          label="Receitas"
          current={data.current.summary.incomeCents}
          previous={data.previous.summary.incomeCents}
          delta={incomeDelta}
          higherIsBetter
        />
        <DeltaCard
          label="Despesas"
          current={data.current.summary.expenseCents}
          previous={data.previous.summary.expenseCents}
          delta={expenseDelta}
          higherIsBetter={false}
        />
        <DeltaCard
          label="Saldo"
          current={data.current.summary.netCents}
          previous={data.previous.summary.netCents}
          delta={netDelta}
          higherIsBetter
        />
      </div>

      <Card className="p-0">
        <div className="border-border border-b px-4 py-3">
          <p className="text-sm font-medium">Despesas por categoria</p>
          <p className="text-muted-foreground text-xs">
            {periodLabel} vs {previousLabel}
          </p>
        </div>
        {merged.length === 0 ? (
          <div className="text-muted-foreground p-6 text-center text-sm">
            Sem despesas nos períodos comparados.
          </div>
        ) : (
          <ul className="divide-border divide-y" role="list">
            {merged.map((row) => {
              const delta = row.currentCents - row.previousCents;
              const pct = row.previousCents > 0 ? (delta / row.previousCents) * 100 : null;
              return (
                <li
                  key={row.key}
                  className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-4 py-2.5 text-sm"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: row.color ?? "var(--muted-foreground)" }}
                    />
                    <span className="truncate">{row.name}</span>
                  </div>
                  <span className="tabular text-muted-foreground hidden text-right text-xs sm:inline">
                    {formatMoney(row.previousCents)}
                  </span>
                  <span className="tabular text-right">{formatMoney(row.currentCents)}</span>
                  <DeltaPill cents={delta} pct={pct} higherIsBetter={false} />
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function DeltaCard({
  label,
  current,
  previous,
  delta,
  higherIsBetter,
}: {
  label: string;
  current: number;
  previous: number;
  delta: number;
  higherIsBetter: boolean;
}) {
  const pct = previous !== 0 ? (delta / Math.abs(previous)) * 100 : null;
  return (
    <Card className="space-y-1.5 p-4">
      <p className="text-muted-foreground text-xs uppercase">{label}</p>
      <p className="tabular text-2xl font-semibold">{formatMoney(current)}</p>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground tabular">Antes: {formatMoney(previous)}</span>
        <DeltaPill cents={delta} pct={pct} higherIsBetter={higherIsBetter} />
      </div>
    </Card>
  );
}

function DeltaPill({
  cents,
  pct,
  higherIsBetter,
}: {
  cents: number;
  pct: number | null;
  higherIsBetter: boolean;
}) {
  if (cents === 0) {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-0.5 text-xs">
        <Minus className="size-3" aria-hidden />
        sem mudança
      </span>
    );
  }
  const isPositive = cents > 0;
  const isGood = higherIsBetter ? isPositive : !isPositive;
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
  const colorClass = isGood ? "text-income" : "text-expense";
  const sign = isPositive ? "+" : "−";
  const absCents = Math.abs(cents);
  return (
    <span
      className={`tabular inline-flex items-center gap-0.5 text-xs font-medium ${colorClass}`}
      aria-label={`${isPositive ? "aumento" : "redução"} de ${formatMoney(absCents)}`}
    >
      <Icon className="size-3" aria-hidden />
      {sign}
      {formatMoney(absCents)}
      {pct !== null && ` (${sign}${Math.abs(pct).toFixed(0)}%)`}
    </span>
  );
}

type MergedRow = {
  key: string;
  name: string;
  color: string | null;
  currentCents: number;
  previousCents: number;
};

function mergeCategories(current: CategoryRow[], previous: CategoryRow[]): MergedRow[] {
  const map = new Map<string, MergedRow>();
  for (const row of current) {
    const key = row.categoryId ?? `name:${row.name}`;
    map.set(key, {
      key,
      name: row.name,
      color: row.color,
      currentCents: row.totalCents,
      previousCents: 0,
    });
  }
  for (const row of previous) {
    const key = row.categoryId ?? `name:${row.name}`;
    const existing = map.get(key);
    if (existing) {
      existing.previousCents = row.totalCents;
    } else {
      map.set(key, {
        key,
        name: row.name,
        color: row.color,
        currentCents: 0,
        previousCents: row.totalCents,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.currentCents - a.currentCents);
}
