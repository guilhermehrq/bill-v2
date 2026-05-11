import { Card } from "@/components/ui/card";
import { format as formatMoney } from "@/lib/money";
import type { ActiveRecurrence } from "../queries";

type Props = {
  recurrences: ActiveRecurrence[];
  averageIncomeCents: number;
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

export function RecurrencesTable({ recurrences, averageIncomeCents }: Props) {
  if (recurrences.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground text-sm">
          Sem recorrências ativas. Cadastre receitas e despesas fixas em /recorrencias.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Descrição</th>
              <th className="px-4 py-3 text-left font-medium">Tipo</th>
              <th className="px-4 py-3 text-left font-medium">Frequência</th>
              <th className="px-4 py-3 text-left font-medium">Categoria</th>
              <th className="px-4 py-3 text-right font-medium">Valor</th>
              <th className="px-4 py-3 text-right font-medium">Mensal eq.</th>
              <th className="px-4 py-3 text-right font-medium">Termina</th>
              <th className="px-4 py-3 text-right font-medium">% renda</th>
            </tr>
          </thead>
          <tbody>
            {recurrences.map((r) => {
              const pct =
                averageIncomeCents > 0 ? (r.monthlyEquivalentCents / averageIncomeCents) * 100 : 0;
              const isIncome = r.type === "income";
              return (
                <tr key={r.id} className="border-border/60 border-t">
                  <td className="px-4 py-3">
                    <span className="font-medium">{r.description}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                        isIncome
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                      }`}
                    >
                      {isIncome ? "Receita" : "Despesa"}
                    </span>
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    {formatFrequency(r.frequency, r.interval)}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    {formatCategory(r.parentCategoryName, r.categoryName)}
                  </td>
                  <td className="tabular px-4 py-3 text-right">{formatMoney(r.amountCents)}</td>
                  <td className="tabular px-4 py-3 text-right">
                    {formatMoney(r.monthlyEquivalentCents)}
                  </td>
                  <td className="tabular px-4 py-3 text-right">
                    {r.endDate ? formatMonthYear(r.endDate) : "—"}
                  </td>
                  <td className="tabular px-4 py-3 text-right">
                    {averageIncomeCents > 0 ? `${pct.toFixed(1)}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function formatFrequency(
  freq: "daily" | "weekly" | "monthly" | "yearly",
  interval: number,
): string {
  const base = {
    daily: interval === 1 ? "Diária" : `A cada ${interval} dias`,
    weekly: interval === 1 ? "Semanal" : `A cada ${interval} sem.`,
    monthly: interval === 1 ? "Mensal" : `A cada ${interval} meses`,
    yearly: interval === 1 ? "Anual" : `A cada ${interval} anos`,
  } as const;
  return base[freq];
}

function formatCategory(parent: string | null, name: string | null): string {
  if (!name) return "—";
  if (parent) return `${parent} · ${name}`;
  return name;
}

function formatMonthYear(dateStr: string): string {
  const [y, m] = dateStr.split("-").map(Number);
  const label = MONTH_LABELS[(m ?? 1) - 1] ?? "";
  return `${label}/${String(y ?? 0).slice(2)}`;
}
