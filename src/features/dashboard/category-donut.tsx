"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { format as formatMoney, toReais } from "@/lib/money";

type Props = {
  data: Array<{
    categoryId: string | null;
    name: string;
    color: string | null;
    totalCents: number;
  }>;
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

export function CategoryDonut({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="text-muted-foreground flex h-[220px] items-center justify-center text-sm">
        Sem despesas no mês.
      </div>
    );
  }

  const total = data.reduce((acc, d) => acc + d.totalCents, 0);

  return (
    <div className="flex h-[220px] flex-col items-center gap-3 md:flex-row">
      <div className="h-[180px] w-[180px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: 12,
              }}
              formatter={(value) => formatMoney(Math.round(Number(value ?? 0) * 100))}
            />
            <Pie
              data={data.map((d) => ({ name: d.name, value: toReais(d.totalCents) }))}
              dataKey="value"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((d, i) => (
                <Cell
                  key={d.categoryId ?? i}
                  fill={d.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex-1 space-y-1 text-sm">
        {data.slice(0, 6).map((d, i) => (
          <li key={d.categoryId ?? i} className="flex items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: d.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length] }}
            />
            <span className="flex-1 truncate">{d.name}</span>
            <span className="tabular text-muted-foreground text-xs">
              {total > 0 ? Math.round((d.totalCents / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
