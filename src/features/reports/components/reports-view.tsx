import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCardModeSelector } from "@/features/settings/credit-card-mode-selector";
import type { CreditCardReportMode } from "@/features/settings/queries";
import { format as formatMoney } from "@/lib/money";
import type { ComparisonData, ReportData } from "../queries";
import { CategoryList } from "./category-list";
import { CategoryTreemap } from "./category-treemap";
import { ComparisonView } from "./comparison-view";
import { EvolutionChart } from "./evolution-chart";
import { ExportCsvButton } from "./export-csv-button";
import { PeriodSelector, type PeriodPreset } from "./period-selector";

type Props = {
  data: ReportData;
  comparison: ComparisonData;
  period: PeriodPreset;
  periodLabel: string;
  previousLabel: string;
  creditCardMode: CreditCardReportMode;
};

export function ReportsView({
  data,
  comparison,
  period,
  periodLabel,
  previousLabel,
  creditCardMode,
}: Props) {
  const hasData = data.summary.transactionCount > 0;

  return (
    <div className="space-y-6 py-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Relatórios</h1>
          <p className="text-muted-foreground text-sm">
            {periodLabel} · {formatRange(data.from, data.to)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodSelector value={period} />
          <CreditCardModeSelector currentMode={creditCardMode} />
          <ExportCsvButton data={data} periodLabel={periodLabel} />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard label="Receitas" valueCents={data.summary.incomeCents} tone="income" />
        <SummaryCard label="Despesas" valueCents={data.summary.expenseCents} tone="expense" />
        <SummaryCard label="Saldo" valueCents={data.summary.netCents} />
        <SummaryCard label="Transações" valueRaw={data.summary.transactionCount.toString()} />
      </div>

      {!hasData ? (
        <Card className="p-10 text-center">
          <p className="text-muted-foreground text-sm">
            Sem transações pagas no período. Ajuste o período acima ou registre transações para ver
            os relatórios.
          </p>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evolução</CardTitle>
              <CardDescription>Receitas, despesas e saldo mês a mês</CardDescription>
            </CardHeader>
            <CardContent>
              <EvolutionChart data={data.evolution} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Despesas por categoria</CardTitle>
              <CardDescription>
                Tamanho proporcional ao gasto · {data.byParentCategory.length} categorias
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CategoryTreemap data={data.byParentCategory} />
            </CardContent>
          </Card>

          <Card className="p-0">
            <div className="border-border border-b px-4 py-3">
              <p className="text-sm font-medium">Detalhamento por categoria</p>
              <p className="text-muted-foreground text-xs">
                Inclui subcategorias com lançamentos no período
              </p>
            </div>
            <CategoryList rows={data.byCategory} totalExpenseCents={data.summary.expenseCents} />
          </Card>

          <section aria-labelledby="comparativo-heading" className="space-y-3">
            <div>
              <h2 id="comparativo-heading" className="text-base font-medium">
                Comparativo
              </h2>
              <p className="text-muted-foreground text-sm">
                {periodLabel} vs {previousLabel}
              </p>
            </div>
            <ComparisonView
              data={comparison}
              periodLabel={periodLabel}
              previousLabel={previousLabel}
            />
          </section>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  valueCents,
  valueRaw,
  tone,
}: {
  label: string;
  valueCents?: number;
  valueRaw?: string;
  tone?: "income" | "expense";
}) {
  const display = valueCents !== undefined ? formatMoney(valueCents) : (valueRaw ?? "—");
  const toneClass = tone === "income" ? "text-income" : tone === "expense" ? "text-expense" : "";
  return (
    <Card className="space-y-1 p-4">
      <p className="text-muted-foreground text-xs uppercase">{label}</p>
      <p className={`tabular text-xl font-semibold ${toneClass}`}>{display}</p>
    </Card>
  );
}

function formatRange(from: string, to: string): string {
  return `${formatBr(from)} – ${formatBr(to)}`;
}

function formatBr(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}
