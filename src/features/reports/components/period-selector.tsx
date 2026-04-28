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
import { PERIOD_LABELS, PERIOD_ORDER, type PeriodPreset } from "../period";

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
      items={PERIOD_ORDER.map((p) => ({ value: p, label: PERIOD_LABELS[p] }))}
    >
      <SelectTrigger className="h-8 w-[180px]" aria-label="Período do relatório">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PERIOD_ORDER.map((p) => (
          <SelectItem key={p} value={p}>
            {PERIOD_LABELS[p]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
