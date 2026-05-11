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
import type { MonthlyProjection } from "../queries";

type Props = {
  data: MonthlyProjection[];
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

export function InstallmentsChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="text-muted-foreground flex h-[280px] items-center justify-center text-sm">
        Sem compromissos futuros.
      </div>
    );
  }

  const chartData = data.map((d) => {
    const [y, m] = d.month.split("-").map(Number);
    const commitmentCents = d.installmentCents + d.recurringExpenseCents;
    return {
      label: `${MONTH_LABELS[(m ?? 1) - 1]?.toUpperCase() ?? ""}/${String(y ?? 0).slice(2)}`,
      parcelas: toReais(d.installmentCents),
      recorrentes: toReais(d.recurringExpenseCents),
      renda: toReais(d.expectedIncomeCents),
      parcelasCents: d.installmentCents,
      recorrentesCents: d.recurringExpenseCents,
      commitmentCents,
      expectedIncomeCents: d.expectedIncomeCents,
    };
  });

  const anyIncome = chartData.some((d) => d.expectedIncomeCents > 0);

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
              const p = item?.payload as (typeof chartData)[number] | undefined;
              if (name === "parcelas") {
                const cents = p?.parcelasCents ?? 0;
                const pct =
                  p && p.expectedIncomeCents > 0 ? (cents / p.expectedIncomeCents) * 100 : 0;
                return [
                  `${formatMoney(cents)}${pct > 0 ? ` · ${pct.toFixed(0)}% da renda` : ""}`,
                  "Parcelas",
                ];
              }
              if (name === "recorrentes") {
                const cents = p?.recorrentesCents ?? 0;
                const pct =
                  p && p.expectedIncomeCents > 0 ? (cents / p.expectedIncomeCents) * 100 : 0;
                return [
                  `${formatMoney(cents)}${pct > 0 ? ` · ${pct.toFixed(0)}% da renda` : ""}`,
                  "Recorrentes",
                ];
              }
              return [formatMoney(Math.round(Number(value ?? 0) * 100)), "Renda esperada"];
            }}
          />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
          <Bar
            dataKey="parcelas"
            stackId="commitment"
            fill="#6366f1"
            radius={[0, 0, 0, 0]}
            name="Parcelas"
          />
          <Bar
            dataKey="recorrentes"
            stackId="commitment"
            fill="#a78bfa"
            radius={[4, 4, 0, 0]}
            name="Recorrentes"
          />
          {anyIncome ? (
            <Line
              type="monotone"
              dataKey="renda"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              name="Renda esperada"
            />
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
