import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format as formatMoney } from "@/lib/money";
import type { ForecastData } from "../queries";
import { InstallmentsChart } from "./installments-chart";
import { InstallmentsTable } from "./installments-table";
import { RecurrencesTable } from "./recurrences-table";

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
  const { summary, monthly, purchases, recurrences } = data;

  // Renda total esperada por mês = recorrente + mediana não-recorrente.
  // Mediana é robusta a outliers (13º, bônus) que distorceriam a média.
  const referenceIncomeCents =
    summary.typicalMonthlyIncomeCents + summary.recurringIncomeMonthlyCents;

  const currentPct = pctOfIncome(summary.currentMonthCommitmentCents, referenceIncomeCents);
  const avgPct = pctOfIncome(summary.averageNext6mCommitmentCents, referenceIncomeCents);

  return (
    <div className="space-y-6 py-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Previsão</h1>
          <p className="text-muted-foreground text-sm">
            Compromisso total (parcelas + recorrentes) e renda esperada por mês.
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
          label="Recorrentes/mês"
          value={formatMoney(summary.recurringExpenseMonthlyCents)}
          hint={
            summary.activeRecurrenceCount > 0
              ? `${summary.activeRecurrenceCount} ativas`
              : "nenhuma cadastrada"
          }
        />
        <SummaryCard
          label="Livre em"
          value={summary.lastInstallmentMonth ? formatMonthYear(summary.lastInstallmentMonth) : "—"}
          hint={
            summary.lastInstallmentMonth
              ? `${summary.activePurchaseCount} compras parceladas`
              : "nada parcelado agora"
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compromisso mês a mês</CardTitle>
          <CardDescription>
            {referenceIncomeCents > 0 ? (
              <>
                Linha verde = renda esperada ({formatMoney(referenceIncomeCents)} — recorrente +
                mediana de {summary.incomeMonthsSampled}m).
              </>
            ) : (
              <>Cadastre receitas pra ver o comparativo com a renda esperada.</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InstallmentsChart data={monthly} />
        </CardContent>
      </Card>

      <section aria-labelledby="compras-heading" className="space-y-3">
        <div>
          <h2 id="compras-heading" className="text-base font-medium">
            Compras parceladas ativas
          </h2>
          <p className="text-muted-foreground text-sm">Ordenadas pelo mês em que terminam.</p>
        </div>
        <InstallmentsTable purchases={purchases} averageIncomeCents={referenceIncomeCents} />
      </section>

      <section aria-labelledby="recorrencias-heading" className="space-y-3">
        <div>
          <h2 id="recorrencias-heading" className="text-base font-medium">
            Recorrências ativas
          </h2>
          <p className="text-muted-foreground text-sm">
            Ordenadas pelo equivalente mensal projetado para os próximos meses.
          </p>
        </div>
        <RecurrencesTable recurrences={recurrences} averageIncomeCents={referenceIncomeCents} />
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
