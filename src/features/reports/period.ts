export type PeriodPreset =
  | "this_month"
  | "last_month"
  | "last_3_months"
  | "last_6_months"
  | "last_12_months"
  | "year_to_date";

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  this_month: "Mês atual",
  last_month: "Mês anterior",
  last_3_months: "Últimos 3 meses",
  last_6_months: "Últimos 6 meses",
  last_12_months: "Últimos 12 meses",
  year_to_date: "Ano até hoje",
};

export const PERIOD_ORDER: PeriodPreset[] = [
  "this_month",
  "last_month",
  "last_3_months",
  "last_6_months",
  "last_12_months",
  "year_to_date",
];

export function periodToRange(
  period: PeriodPreset,
  today: Date = new Date(),
): {
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
  label: string;
} {
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();

  function range(
    fromY: number,
    fromM: number,
    fromD: number,
    toY: number,
    toM: number,
    toD: number,
  ) {
    return {
      from: iso(new Date(fromY, fromM, fromD)),
      to: iso(new Date(toY, toM, toD)),
    };
  }

  let r: { from: string; to: string };
  let prev: { from: string; to: string };

  switch (period) {
    case "this_month":
      r = range(y, m, 1, y, m + 1, 0);
      prev = range(y, m - 1, 1, y, m, 0);
      break;
    case "last_month":
      r = range(y, m - 1, 1, y, m, 0);
      prev = range(y, m - 2, 1, y, m - 1, 0);
      break;
    case "last_3_months":
      r = range(y, m - 2, 1, y, m + 1, 0);
      prev = range(y, m - 5, 1, y, m - 2, 0);
      break;
    case "last_6_months":
      r = range(y, m - 5, 1, y, m + 1, 0);
      prev = range(y, m - 11, 1, y, m - 5, 0);
      break;
    case "last_12_months":
      r = range(y, m - 11, 1, y, m + 1, 0);
      prev = range(y - 1, m - 11, 1, y - 1, m + 1, 0);
      break;
    case "year_to_date":
      r = range(y, 0, 1, y, m, d);
      prev = range(y - 1, 0, 1, y - 1, m, d);
      break;
  }

  return { ...r, previousFrom: prev.from, previousTo: prev.to, label: PERIOD_LABELS[period] };
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
