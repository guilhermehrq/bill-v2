"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format as formatMoney, toReais } from "@/lib/money";
import type { EvolutionRow } from "../queries";

type Props = {
  data: EvolutionRow[];
};

const MONTH_LABELS = [
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

export function EvolutionChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="text-muted-foreground flex h-[280px] items-center justify-center text-sm">
        Sem dados no período.
      </div>
    );
  }

  const chartData = data.map((d) => {
    const [y, m] = d.month.split("-").map(Number);
    return {
      label: `${MONTH_LABELS[(m ?? 1) - 1]?.toUpperCase() ?? ""}/${String(y ?? 0).slice(2)}`,
      receita: toReais(d.incomeCents),
      despesa: toReais(d.expenseCents),
      saldo: toReais(d.netCents),
    };
  });

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 12, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `R$ ${v >= 1000 ? Math.round(v / 1000) + "k" : v}`}
          />
          <Tooltip
            cursor={{ stroke: "var(--accent)" }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              fontSize: 12,
              color: "var(--popover-foreground)",
            }}
            formatter={(value) => formatMoney(Math.round(Number(value ?? 0) * 100))}
          />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
          <Line
            type="monotone"
            dataKey="receita"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="despesa"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="saldo"
            stroke="#6366f1"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
