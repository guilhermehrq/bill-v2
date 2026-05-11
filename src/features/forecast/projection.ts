import { computeNextDateString } from "@/features/recurrences/queries";

export type RecurrenceForProjection = {
  id: string;
  amountCents: number;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  startDate: string; // YYYY-MM-DD
  endDate: string | null;
  maxOccurrences: number | null;
  lastGeneratedDate: string | null;
};

// Projects how much a recurrence contributes to each month in [fromMonth, toMonth].
// Returns a map of monthKey (YYYY-MM-01) -> total cents in that month.
// Uses the same date math as the generator/list view so projections stay
// consistent with what will actually get materialized.
export function projectRecurrenceMonthly(
  rec: RecurrenceForProjection,
  fromMonth: string, // YYYY-MM-01
  toMonth: string, // YYYY-MM-01 (inclusive)
): Map<string, number> {
  const result = new Map<string, number>();

  const toEnd = endOfMonth(toMonth);
  const maxOcc = rec.maxOccurrences ?? Infinity;

  let cursor = rec.lastGeneratedDate;
  let generated = 0;

  // Hard cap. With daily frequency over 36 months that's ~1100 iterations.
  const HARD_CAP = 2000;

  for (let i = 0; i < HARD_CAP; i++) {
    const next = computeNextDateString(
      rec.frequency,
      rec.interval,
      rec.dayOfMonth,
      rec.dayOfWeek,
      rec.startDate,
      cursor,
    );

    if (next > toEnd) break;
    if (rec.endDate && next > rec.endDate) break;
    if (generated >= maxOcc) break;

    if (next >= fromMonth) {
      const key = monthKeyOf(next);
      result.set(key, (result.get(key) ?? 0) + rec.amountCents);
    }

    cursor = next;
    generated += 1;
  }

  return result;
}

function monthKeyOf(dateStr: string): string {
  // dateStr is YYYY-MM-DD
  return `${dateStr.slice(0, 7)}-01`;
}

function endOfMonth(monthKey: string): string {
  // monthKey is YYYY-MM-01 — return YYYY-MM-{lastDay}
  const [y, m] = monthKey.split("-").map(Number) as [number, number, number];
  // last day of month: day 0 of next month
  const last = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}
