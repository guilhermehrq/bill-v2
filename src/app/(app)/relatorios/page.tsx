import { redirect } from "next/navigation";
import { ReportsView } from "@/features/reports/components/reports-view";
import {
  PERIOD_LABELS,
  periodToRange,
  type PeriodPreset,
} from "@/features/reports/components/period-selector";
import { loadComparisonData, loadReportData } from "@/features/reports/queries";
import { getUserSettings } from "@/features/settings/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Relatórios · FinPessoal" };

const VALID_PERIODS: PeriodPreset[] = [
  "this_month",
  "last_month",
  "last_3_months",
  "last_6_months",
  "last_12_months",
  "year_to_date",
];

type SearchParams = Promise<{ periodo?: string }>;

export default async function RelatoriosPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const period: PeriodPreset = VALID_PERIODS.includes(sp.periodo as PeriodPreset)
    ? (sp.periodo as PeriodPreset)
    : "last_3_months";

  const range = periodToRange(period);
  const settings = await getUserSettings(user.id);

  const [data, comparison] = await Promise.all([
    loadReportData(user.id, range.from, range.to, settings.creditCardReportMode),
    loadComparisonData(
      user.id,
      { from: range.from, to: range.to },
      { from: range.previousFrom, to: range.previousTo },
      settings.creditCardReportMode,
    ),
  ]);

  return (
    <ReportsView
      data={data}
      comparison={comparison}
      period={period}
      periodLabel={PERIOD_LABELS[period]}
      previousLabel="período anterior"
      creditCardMode={settings.creditCardReportMode}
    />
  );
}
