import { ArrowDownRight, ArrowUpRight, ChevronRight, Minus } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { format } from "@/lib/money";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  valueCents: number;
  deltaCents?: number;
  deltaLabel?: string;
  tone?: "neutral" | "income" | "expense";
  href?: string;
  hint?: string;
};

export function KpiCard({
  label,
  valueCents,
  deltaCents,
  deltaLabel,
  tone = "neutral",
  href,
  hint,
}: Props) {
  const valueClass = cn(
    "tabular text-2xl font-semibold",
    tone === "income" && "text-income",
    tone === "expense" && "text-expense",
    tone === "neutral" && valueCents < 0 && "text-expense",
  );

  const trend = deltaCents !== undefined ? sign(deltaCents) : 0;

  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          {label}
        </p>
        {href && <ChevronRight className="text-muted-foreground size-3.5" aria-hidden />}
      </div>
      <p className={valueClass}>{format(valueCents)}</p>
      {deltaCents !== undefined && deltaLabel !== undefined ? (
        <p
          className={cn(
            "tabular flex items-center gap-1 text-xs",
            trend > 0 && "text-income",
            trend < 0 && "text-expense",
            trend === 0 && "text-muted-foreground",
          )}
        >
          {trend > 0 ? (
            <ArrowUpRight className="size-3" />
          ) : trend < 0 ? (
            <ArrowDownRight className="size-3" />
          ) : (
            <Minus className="size-3" />
          )}
          {formatDelta(deltaCents)} {deltaLabel}
        </p>
      ) : hint ? (
        <p className="text-muted-foreground text-xs">{hint}</p>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        <Card className="hover:bg-accent/40 space-y-1 p-4 transition-colors">{body}</Card>
      </Link>
    );
  }

  return <Card className="space-y-1 p-4">{body}</Card>;
}

function sign(n: number): -1 | 0 | 1 {
  if (n > 0) return 1;
  if (n < 0) return -1;
  return 0;
}

function formatDelta(cents: number): string {
  const abs = Math.abs(cents);
  return (cents >= 0 ? "+ " : "- ") + format(abs);
}
