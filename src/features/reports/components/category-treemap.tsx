"use client";

import { ResponsiveContainer, Tooltip, Treemap } from "recharts";
import { format as formatMoney, toReais } from "@/lib/money";
import type { CategoryRow } from "../queries";

type Props = {
  data: CategoryRow[];
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

type LeafProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  name?: string;
  color?: string;
};

function TreemapLeaf(props: LeafProps) {
  const { x = 0, y = 0, width = 0, height = 0, index = 0, name = "", color } = props;
  const fill = color ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
  if (width <= 0 || height <= 0) return null;
  const showLabel = width > 64 && height > 24;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="var(--background)" />
      {showLabel && (
        <text
          x={x + 6}
          y={y + 16}
          fill="#ffffff"
          fontSize={11}
          fontWeight={500}
          style={{ pointerEvents: "none" }}
        >
          {name.length > Math.floor(width / 7) ? `${name.slice(0, Math.floor(width / 7))}…` : name}
        </text>
      )}
    </g>
  );
}

export function CategoryTreemap({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="text-muted-foreground flex h-[280px] items-center justify-center text-sm">
        Sem despesas no período selecionado.
      </div>
    );
  }

  const chartData = data.map((d, i) => ({
    name: d.name,
    size: toReais(d.totalCents),
    color: d.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
  }));

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={chartData}
          dataKey="size"
          nameKey="name"
          stroke="var(--background)"
          content={<TreemapLeaf />}
          isAnimationActive={false}
        >
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              fontSize: 12,
              color: "var(--popover-foreground)",
            }}
            formatter={(value) => formatMoney(Math.round(Number(value ?? 0) * 100))}
          />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}
