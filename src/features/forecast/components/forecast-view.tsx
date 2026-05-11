import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format as formatMoney } from "@/lib/money";
import type { ForecastData } from "../queries";
import { InstallmentsChart } from "./installments-chart";
import { InstallmentsTable } from "./installments-table";

type Props = {
  data: ForecastData;
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

export function ForecastView({ data }: Props) {
  const { summary, monthly, purchases } = data;
  const hasInstallments = purchases.length > 0;

  const currentPct = pctOfIncome(
    summary.currentMonthCommitmentCents,
    summary.averageMonthlyIncomeCents,
  );
  const avgPct = pctOfIncome(
    summary.averageNext6mCommitmentCents,
    summary.averageMonthlyIncomeCents,
  );

  return (
    <div className="space-y-6 py-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Previsão</h1>
          <p className="text-muted-foreground text-sm">
            Compromissos futuros de cartão e impacto na renda média.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard
          label="Este mês"
          value={formatMoney(summary.currentMonthCommitmentCents)}
          hint={currentPct !== null ? `${currentPct.toFixed(0)}% da renda` : undefined}
          tone={toneFor(currentPct)}
        />
        <SummaryCard
          label="Média 6m"
          value={formatMoney(summary.averageNext6mCommitmentCents)}
          hint={avgPct !== null ? `${avgPct.toFixed(0)}% da renda` : undefined}
          tone={toneFor(avgPct)}
        />
        <SummaryCard
          label="Compras ativas"
          value={summary.activePurchaseCount.toString()}
          hint={hasInstallments ? "parceladas em andamento" : "nada parcelado agora"}
        />
        <SummaryCard
          label="Livre em"
          value={summary.lastInstallmentMonth ? formatMonthYear(summary.lastInstallmentMonth) : "—"}
          hint={summary.lastInstallmentMonth ? "última parcela" : undefined}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parcelas mês a mês</CardTitle>
          <CardDescription>
            {summary.averageMonthlyIncomeCents > 0 ? (
              <>
                Linha verde = renda média dos últimos 3 meses (
                {formatMoney(summary.averageMonthlyIncomeCents)})
              </>
            ) : (
              <>Cadastre receitas pra ver o comparativo com a renda média.</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InstallmentsChart
            data={monthly}
            averageIncomeCents={summary.averageMonthlyIncomeCents}
          />
        </CardContent>
      </Card>

      <section aria-labelledby="compras-heading" className="space-y-3">
        <div>
          <h2 id="compras-heading" className="text-base font-medium">
            Compras parceladas ativas
          </h2>
          <p className="text-muted-foreground text-sm">Ordenadas pelo mês em que terminam.</p>
        </div>
        <InstallmentsTable
          purchases={purchases}
          averageIncomeCents={summary.averageMonthlyIncomeCents}
        />
      </section>
    </div>
  );
}

function pctOfIncome(commitmentCents: number, incomeCents: number): number | null {
  if (incomeCents <= 0) return null;
  return (commitmentCents / incomeCents) * 100;
}

// 0-30% verde, 30-50% neutro, >50% vermelho.
function toneFor(pct: number | null): "income" | "expense" | undefined {
  if (pct === null) return undefined;
  if (pct >= 50) return "expense";
  if (pct <= 30) return "income";
  return undefined;
}

function formatMonthYear(dateStr: string): string {
  const [y, m] = dateStr.split("-").map(Number);
  const label = MONTH_LABELS[(m ?? 1) - 1] ?? "";
  return `${label}/${String(y ?? 0).slice(2)}`;
}

function SummaryCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "income" | "expense";
}) {
  const toneClass = tone === "income" ? "text-income" : tone === "expense" ? "text-expense" : "";
  return (
    <Card className="space-y-1 p-4">
      <p className="text-muted-foreground text-xs uppercase">{label}</p>
      <p className={`tabular text-xl font-semibold ${toneClass}`}>{value}</p>
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </Card>
  );
}
