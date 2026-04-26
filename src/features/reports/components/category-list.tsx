import { format as formatMoney } from "@/lib/money";
import type { CategoryRow } from "../queries";

type Props = {
  rows: CategoryRow[];
  totalExpenseCents: number;
};

export function CategoryList({ rows, totalExpenseCents }: Props) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground p-6 text-center text-sm">
        Nenhuma despesa categorizada no período.
      </p>
    );
  }

  return (
    <ul className="divide-border divide-y" role="list">
      {rows.map((r) => {
        const pct = totalExpenseCents > 0 ? (r.totalCents / totalExpenseCents) * 100 : 0;
        return (
          <li
            key={r.categoryId ?? r.name}
            className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-2.5 text-sm"
          >
            <div className="flex items-center gap-2 truncate">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: r.color ?? "var(--muted-foreground)" }}
              />
              <span className="truncate">
                {r.parentName ? (
                  <>
                    <span className="text-muted-foreground">{r.parentName} ›</span>{" "}
                    <span>{r.name}</span>
                  </>
                ) : (
                  r.name
                )}
              </span>
              <span className="text-muted-foreground text-xs">
                {r.count} {r.count === 1 ? "lançamento" : "lançamentos"}
              </span>
            </div>
            <span className="tabular text-muted-foreground text-xs">{pct.toFixed(1)}%</span>
            <span className="tabular text-right font-medium">{formatMoney(r.totalCents)}</span>
          </li>
        );
      })}
    </ul>
  );
}
