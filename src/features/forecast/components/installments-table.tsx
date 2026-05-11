import { Card } from "@/components/ui/card";
import { format as formatMoney } from "@/lib/money";
import type { InstallmentPurchase } from "../queries";

type Props = {
  purchases: InstallmentPurchase[];
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

export function InstallmentsTable({ purchases, averageIncomeCents }: Props) {
  if (purchases.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground text-sm">
          Sem compras parceladas ativas. As novas aparecerão aqui assim que você lançar.
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
              <th className="px-4 py-3 text-left font-medium">Compra</th>
              <th className="px-4 py-3 text-left font-medium">Cartão</th>
              <th className="px-4 py-3 text-right font-medium">Progresso</th>
              <th className="px-4 py-3 text-right font-medium">Mensal</th>
              <th className="px-4 py-3 text-right font-medium">Restante</th>
              <th className="px-4 py-3 text-right font-medium">Termina</th>
              <th className="px-4 py-3 text-right font-medium">% renda</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((p) => {
              const pct = averageIncomeCents > 0 ? (p.monthlyCents / averageIncomeCents) * 100 : 0;
              return (
                <tr key={p.purchaseId} className="border-border/60 border-t">
                  <td className="px-4 py-3">
                    <span className="font-medium">{p.description}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2">
                      <span
                        aria-hidden
                        className="inline-block size-2 rounded-full"
                        style={{ background: p.cardColor ?? "var(--muted-foreground)" }}
                      />
                      {p.cardName}
                    </span>
                  </td>
                  <td className="tabular px-4 py-3 text-right">
                    {p.nextInstallment}/{p.installmentTotal}
                  </td>
                  <td className="tabular px-4 py-3 text-right">{formatMoney(p.monthlyCents)}</td>
                  <td className="tabular px-4 py-3 text-right">{formatMoney(p.remainingCents)}</td>
                  <td className="tabular px-4 py-3 text-right">{formatMonthYear(p.lastDate)}</td>
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

function formatMonthYear(dateStr: string): string {
  const [y, m] = dateStr.split("-").map(Number);
  const label = MONTH_LABELS[(m ?? 1) - 1] ?? "";
  return `${label}/${String(y ?? 0).slice(2)}`;
}
