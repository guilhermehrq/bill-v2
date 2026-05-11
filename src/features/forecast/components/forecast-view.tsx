import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format as formatMoney } from "@/lib/money";
import type { ForecastData } from "../queries";
import { CashflowChart } from "./cashflow-chart";
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

  const avgCommitmentPct = pctOfIncome(summary.averageNext6mCommitmentCents, referenceIncomeCents);

  const balanceTrend90 = summary.projectedBalance90dCents - summary.currentBalanceCents;
  const balance90Tone: "income" | "expense" | undefined =
    summary.projectedBalance90dCents < 0 ? "expense" : balanceTrend90 >= 0 ? "income" : undefined;

  const worstTone: "income" | "expense" | undefined =
    summary.worstMonth && summary.worstMonth.balanceCents < 0 ? "expense" : undefined;

  return (
    <div className="space-y-6 py-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Previsão</h1>
          <p className="text-muted-foreground text-sm">
            Fluxo de caixa, compromissos e renda esperada nos próximos meses.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard
          label="Saldo hoje"
          value={formatMoney(summary.currentBalanceCents)}
          hint="contas inclusas no total"
        />
        <SummaryCard
          label="Em 90 dias"
          value={formatMoney(summary.projectedBalance90dCents)}
          hint={
            balanceTrend90 !== 0
              ? `${balanceTrend90 > 0 ? "+" : "−"}${formatMoney(Math.abs(balanceTrend90))} vs hoje`
              : "sem variação projetada"
          }
          tone={balance90Tone}
        />
        <SummaryCard
          label="Mês mais apertado"
          value={summary.worstMonth ? formatMonthYear(summary.worstMonth.month) : "—"}
          hint={
            summary.worstMonth
              ? formatMoney(summary.worstMonth.balanceCents)
              : "sem dados projetados"
          }
          tone={worstTone}
        />
        <SummaryCard
          label="Compromisso médio"
          value={formatMoney(summary.averageNext6mCommitmentCents)}
          hint={
            avgCommitmentPct !== null
              ? `${avgCommitmentPct.toFixed(0)}% da renda · 6m`
              : "parcelas + recorrentes"
          }
          tone={toneForCommitment(avgCommitmentPct)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fluxo de caixa projetado</CardTitle>
          <CardDescription>
            Barras = saldo do mês (entradas − saídas). Linha = saldo acumulado partindo de{" "}
            {formatMoney(summary.currentBalanceCents)}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CashflowChart data={monthly} />
        </CardContent>
      </Card>

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
          <p className="text-muted-foreground text-sm">
            {summary.lastInstallmentMonth ? (
              <>
                {summary.activePurchaseCount} ativas · livre em{" "}
                {formatMonthYear(summary.lastInstallmentMonth)}.
              </>
            ) : (
              <>Sem compras parceladas no momento.</>
            )}
          </p>
        </div>
        <InstallmentsTable purchases={purchases} averageIncomeCents={referenceIncomeCents} />
      </section>

      <section aria-labelledby="recorrencias-heading" className="space-y-3">
        <div>
          <h2 id="recorrencias-heading" className="text-base font-medium">
            Recorrências ativas
          </h2>
          <p className="text-muted-foreground text-sm">
            {summary.activeRecurrenceCount > 0 ? (
              <>
                {summary.activeRecurrenceCount} ativas · despesa fixa{" "}
                {formatMoney(summary.recurringExpenseMonthlyCents)}/mês.
              </>
            ) : (
              <>Sem recorrências cadastradas.</>
            )}
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
function toneForCommitment(pct: number | null): "income" | "expense" | undefined {
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
