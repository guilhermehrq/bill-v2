"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format as formatMoney, toReais } from "@/lib/money";
import type { MonthlyFlow } from "./queries";

type Props = {
  data: MonthlyFlow[];
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

export function CashflowChart({ data }: Props) {
  const chartData = data.map((d) => {
    const [, m] = d.month.split("-").map(Number);
    return {
      monthLabel: (MONTH_LABELS[m! - 1] ?? "").toUpperCase(),
      receita: toReais(d.incomeCents),
      despesa: toReais(d.expenseCents),
    };
  });

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 12, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
          <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `R$ ${v >= 1000 ? Math.round(v / 1000) + "k" : v}`}
          />
          <Tooltip
            cursor={{ fill: "var(--accent)" }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              fontSize: 12,
            }}
            formatter={(value) => formatMoney(Math.round(Number(value ?? 0) * 100))}
          />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="receita" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="despesa" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
