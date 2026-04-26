"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type PeriodPreset =
  | "this_month"
  | "last_month"
  | "last_3_months"
  | "last_6_months"
  | "last_12_months"
  | "year_to_date";

const LABELS: Record<PeriodPreset, string> = {
  this_month: "Mês atual",
  last_month: "Mês anterior",
  last_3_months: "Últimos 3 meses",
  last_6_months: "Últimos 6 meses",
  last_12_months: "Últimos 12 meses",
  year_to_date: "Ano até hoje",
};

const ORDER: PeriodPreset[] = [
  "this_month",
  "last_month",
  "last_3_months",
  "last_6_months",
  "last_12_months",
  "year_to_date",
];

type Props = {
  value: PeriodPreset;
};

export function PeriodSelector({ value }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function handleChange(next: string | null) {
    if (!next) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("periodo", next);
    startTransition(() => {
      router.push(`/relatorios?${params.toString()}`);
    });
  }

  return (
    <Select
      value={value}
      onValueChange={handleChange}
      disabled={isPending}
      items={ORDER.map((p) => ({ value: p, label: LABELS[p] }))}
    >
      <SelectTrigger className="h-8 w-[180px]" aria-label="Período do relatório">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ORDER.map((p) => (
          <SelectItem key={p} value={p}>
            {LABELS[p]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function periodToRange(
  period: PeriodPreset,
  today: Date = new Date(),
): {
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
  label: string;
} {
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();

  function range(
    fromY: number,
    fromM: number,
    fromD: number,
    toY: number,
    toM: number,
    toD: number,
  ) {
    return {
      from: iso(new Date(fromY, fromM, fromD)),
      to: iso(new Date(toY, toM, toD)),
    };
  }

  let r: { from: string; to: string };
  let prev: { from: string; to: string };

  switch (period) {
    case "this_month":
      r = range(y, m, 1, y, m + 1, 0);
      prev = range(y, m - 1, 1, y, m, 0);
      break;
    case "last_month":
      r = range(y, m - 1, 1, y, m, 0);
      prev = range(y, m - 2, 1, y, m - 1, 0);
      break;
    case "last_3_months":
      r = range(y, m - 2, 1, y, m + 1, 0);
      prev = range(y, m - 5, 1, y, m - 2, 0);
      break;
    case "last_6_months":
      r = range(y, m - 5, 1, y, m + 1, 0);
      prev = range(y, m - 11, 1, y, m - 5, 0);
      break;
    case "last_12_months":
      r = range(y, m - 11, 1, y, m + 1, 0);
      prev = range(y - 1, m - 11, 1, y - 1, m + 1, 0);
      break;
    case "year_to_date":
      r = range(y, 0, 1, y, m, d);
      prev = range(y - 1, 0, 1, y - 1, m, d);
      break;
  }

  return { ...r, previousFrom: prev.from, previousTo: prev.to, label: LABELS[period] };
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const PERIOD_LABELS = LABELS;
