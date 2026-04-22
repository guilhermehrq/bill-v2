import { parseISO } from "date-fns";
import { format as formatMoney } from "@/lib/money";
import { formatShort } from "@/lib/dates";

type Props = {
  items: Array<{
    id: string;
    date: string;
    description: string;
    amountCents: number;
    type: "income" | "expense" | "transfer";
    accountName: string | null;
    categoryName: string | null;
  }>;
};

export function UpcomingList({ items }: Props) {
  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">Nada previsto para os próximos 7 dias.</p>;
  }

  return (
    <ul className="divide-y">
      {items.map((t) => (
        <li key={t.id} className="flex items-center gap-3 py-2">
          <span className="text-muted-foreground tabular w-12 shrink-0 text-xs">
            {formatShort(parseISO(t.date)).slice(0, 5)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{t.description}</p>
            <p className="text-muted-foreground truncate text-xs">
              {t.categoryName ?? (t.type === "transfer" ? "Transferência" : "Sem categoria")}
              {t.accountName ? ` · ${t.accountName}` : ""}
            </p>
          </div>
          <span className="tabular text-sm font-medium">{formatMoney(t.amountCents)}</span>
        </li>
      ))}
    </ul>
  );
}
