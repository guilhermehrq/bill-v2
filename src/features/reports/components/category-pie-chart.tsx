"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { format as formatMoney, toReais } from "@/lib/money";
import type { CategoryGroupRow } from "../queries";

type Props = {
  groups: CategoryGroupRow[];
  totalCents: number;
  tone: "expense" | "income";
};

const FALLBACK_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#14b8a6",
  "#0ea5e9",
];

export function CategoryPieChart({ groups, totalCents, tone }: Props) {
  if (groups.length === 0 || totalCents === 0) {
    return (
      <div className="text-muted-foreground flex h-[260px] items-center justify-center text-sm">
        Sem dados no período.
      </div>
    );
  }

  const chartData = groups.map((g, i) => ({
    name: g.name,
    valueReais: toReais(g.totalCents),
    valueCents: g.totalCents,
    fill: g.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]!,
  }));

  const toneLabelClass = tone === "income" ? "text-income" : "text-expense";

  return (
    <div className="relative h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="valueReais"
            nameKey="name"
            innerRadius={72}
            outerRadius={108}
            stroke="var(--background)"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {chartData.map((d, i) => (
              <Cell key={i} fill={d.fill} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              fontSize: 12,
              color: "var(--popover-foreground)",
            }}
            formatter={(value, _name, item) => {
              const cents = Number(item?.payload?.valueCents ?? 0);
              const pct = totalCents > 0 ? (cents / totalCents) * 100 : 0;
              return [`${formatMoney(cents)} · ${pct.toFixed(1)}%`, item?.payload?.name];
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-muted-foreground text-[10px] tracking-wider uppercase">Total</span>
        <span className={`tabular text-base font-semibold ${toneLabelClass}`}>
          {formatMoney(totalCents)}
        </span>
      </div>
    </div>
  );
}
