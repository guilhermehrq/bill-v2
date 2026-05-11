"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format as formatMoney, toReais } from "@/lib/money";
import type { MonthlyInstallment } from "../queries";

type Props = {
  data: MonthlyInstallment[];
  averageIncomeCents: number;
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

export function InstallmentsChart({ data, averageIncomeCents }: Props) {
  if (data.length === 0) {
    return (
      <div className="text-muted-foreground flex h-[280px] items-center justify-center text-sm">
        Sem parcelas futuras.
      </div>
    );
  }

  const incomeReais = toReais(averageIncomeCents);

  const chartData = data.map((d) => {
    const [y, m] = d.month.split("-").map(Number);
    return {
      label: `${MONTH_LABELS[(m ?? 1) - 1]?.toUpperCase() ?? ""}/${String(y ?? 0).slice(2)}`,
      parcelas: toReais(d.totalCents),
      parcelasCents: d.totalCents,
      renda: incomeReais,
    };
  });

  const showIncomeLine = averageIncomeCents > 0;

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 12, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `R$ ${v >= 1000 ? Math.round(v / 1000) + "k" : v}`}
          />
          <Tooltip
            cursor={{ fill: "var(--accent)", opacity: 0.15 }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              fontSize: 12,
              color: "var(--popover-foreground)",
            }}
            formatter={(value, name, item) => {
              if (name === "parcelas") {
                const cents = Number(item?.payload?.parcelasCents ?? 0);
                const pct = averageIncomeCents > 0 ? (cents / averageIncomeCents) * 100 : 0;
                return [
                  `${formatMoney(cents)}${pct > 0 ? ` · ${pct.toFixed(0)}% da renda` : ""}`,
                  "Parcelas",
                ];
              }
              return [formatMoney(Math.round(Number(value ?? 0) * 100)), "Renda média"];
            }}
          />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="parcelas" fill="#6366f1" radius={[4, 4, 0, 0]} name="Parcelas" />
          {showIncomeLine ? (
            <Line
              type="monotone"
              dataKey="renda"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              name="Renda média (3m)"
            />
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
