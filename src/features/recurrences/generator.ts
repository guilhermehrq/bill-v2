import "server-only";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { recurrences, transactions } from "@/db/schema";
import { computeNextDateString } from "./queries";

type Scope = { userId: string } | "all";

export type GenerationResult = {
  createdCount: number;
  recurrencesProcessed: number;
};

// Generates all pending occurrences up to (today + daysAhead). Idempotent:
// respects last_generated_date and end_date/max_occurrences. Safe to run
// on a schedule or on-demand (e.g. after creating/editing a recurrence).
export async function generateUpcoming(
  scope: Scope = "all",
  daysAhead = 30,
): Promise<GenerationResult> {
  const limit = isoDate(addDays(new Date(), daysAhead));

  const base = db
    .select({
      id: recurrences.id,
      userId: recurrences.userId,
      description: recurrences.description,
      amountCents: recurrences.amountCents,
      type: recurrences.type,
      categoryId: recurrences.categoryId,
      accountId: recurrences.accountId,
      creditCardId: recurrences.creditCardId,
      frequency: recurrences.frequency,
      interval: recurrences.interval,
      dayOfMonth: recurrences.dayOfMonth,
      dayOfWeek: recurrences.dayOfWeek,
      startDate: recurrences.startDate,
      endDate: recurrences.endDate,
      maxOccurrences: recurrences.maxOccurrences,
      lastGeneratedDate: recurrences.lastGeneratedDate,
    })
    .from(recurrences);

  const active = await (scope === "all"
    ? base.where(eq(recurrences.active, true))
    : base.where(and(eq(recurrences.active, true), eq(recurrences.userId, scope.userId))));

  let createdCount = 0;

  for (const r of active) {
    if (r.type === "transfer") continue;

    let generatedSoFar = 0;
    if (r.maxOccurrences) {
      const [row] = await db
        .select({ c: count() })
        .from(transactions)
        .where(and(eq(transactions.userId, r.userId), eq(transactions.recurrenceId, r.id)));
      generatedSoFar = Number(row?.c ?? 0);
    }

    let lastGenerated = r.lastGeneratedDate;

    while (true) {
      const next = computeNextDateString(
        r.frequency,
        r.interval,
        r.dayOfMonth,
        r.dayOfWeek,
        r.startDate,
        lastGenerated,
      );
      if (next > limit) break;
      if (r.endDate && next > r.endDate) break;
      if (r.maxOccurrences && generatedSoFar >= r.maxOccurrences) break;

      await db.insert(transactions).values({
        userId: r.userId,
        type: r.type,
        description: r.description,
        amountCents: Number(r.amountCents),
        date: next,
        purchaseDate: next,
        accountId: r.accountId ?? null,
        creditCardId: r.creditCardId ?? null,
        categoryId: r.categoryId ?? null,
        recurrenceId: r.id,
        isPaid: false,
        tags: [],
      });

      createdCount += 1;
      generatedSoFar += 1;
      lastGenerated = next;
    }

    if (lastGenerated && lastGenerated !== r.lastGeneratedDate) {
      await db
        .update(recurrences)
        .set({ lastGeneratedDate: lastGenerated, updatedAt: new Date() })
        .where(and(eq(recurrences.id, r.id), eq(recurrences.userId, r.userId)));
    }
  }

  return { createdCount, recurrencesProcessed: active.length };
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
