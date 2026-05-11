"use client";

import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
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

const POSITIVE_FILL = "#10b981";
const NEGATIVE_FILL = "#ef4444";

export function CashflowChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="text-muted-foreground flex h-[280px] items-center justify-center text-sm">
        Sem dados de fluxo.
      </div>
    );
  }

  // Limita a 12 meses pra manter a leitura clara — fluxo de caixa é decisão
  // de curto/médio prazo.
  const visible = data.slice(0, 12);

  const chartData = visible.map((d) => {
    const [y, m] = d.month.split("-").map(Number);
    return {
      label: `${MONTH_LABELS[(m ?? 1) - 1]?.toUpperCase() ?? ""}/${String(y ?? 0).slice(2)}`,
      net: toReais(d.netCashCents),
      saldo: toReais(d.cumulativeBalanceCents),
      netCents: d.netCashCents,
      cashInCents: d.cashInCents,
      cashOutCents: d.cashOutCents,
      cumulativeBalanceCents: d.cumulativeBalanceCents,
    };
  });

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
            tickFormatter={(v: number) => `R$ ${formatCompact(v)}`}
          />
          <ReferenceLine y={0} stroke="var(--border)" />
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
              if (name === "net") {
                const cents = p?.netCents ?? 0;
                const inOut = p
                  ? `entra ${formatMoney(p.cashInCents)} · sai ${formatMoney(p.cashOutCents)}`
                  : "";
                return [`${formatMoney(cents)} (${inOut})`, "Saldo do mês"];
              }
              return [formatMoney(Math.round(Number(value ?? 0) * 100)), "Saldo acumulado"];
            }}
          />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="net" name="Saldo do mês" radius={[4, 4, 4, 4]}>
            {chartData.map((d, i) => (
              <Cell key={i} fill={d.netCents >= 0 ? POSITIVE_FILL : NEGATIVE_FILL} />
            ))}
          </Bar>
          <Line
            type="monotone"
            dataKey="saldo"
            stroke="#6366f1"
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            name="Saldo acumulado"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function formatCompact(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1000) return `${Math.round(v / 1000)}k`;
  return String(Math.round(v));
}
