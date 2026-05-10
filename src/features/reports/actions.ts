"use server";

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getUserSettings } from "@/features/settings/queries";
import { createClient } from "@/lib/supabase/server";
import { bucketDateExpr } from "./queries";

export type CategoryReportTransaction = {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amountCents: number;
  type: "income" | "expense";
  accountName: string | null;
  cardName: string | null;
  installmentNumber: number | null;
  installmentTotal: number | null;
};

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

type Input = {
  // null when fetching transactions tagged with no category at all.
  categoryId: string | null;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  type: "income" | "expense";
};

export async function loadCategoryReportTransactionsAction(
  input: Input,
): Promise<ActionResult<CategoryReportTransaction[]>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado" };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.from) || !/^\d{4}-\d{2}-\d{2}$/.test(input.to)) {
    return { ok: false, error: "Período inválido" };
  }
  if (input.type !== "income" && input.type !== "expense") {
    return { ok: false, error: "Tipo inválido" };
  }

  const settings = await getUserSettings(user.id);
  const bucket = bucketDateExpr(settings.creditCardReportMode);

  const categoryClause =
    input.categoryId === null
      ? sql`transactions.category_id IS NULL`
      : sql`transactions.category_id = ${input.categoryId}`;

  const rows = await db.execute(sql`
    SELECT
      transactions.id,
      transactions.description,
      transactions.amount_cents,
      transactions.type,
      transactions.date,
      transactions.installment_number,
      transactions.installment_total,
      accounts.name AS account_name,
      credit_cards.name AS card_name
    FROM transactions
    LEFT JOIN accounts ON accounts.id = transactions.account_id
    LEFT JOIN credit_cards ON credit_cards.id = transactions.credit_card_id
    LEFT JOIN credit_card_invoices ON credit_card_invoices.id = transactions.invoice_id
    WHERE transactions.user_id = ${user.id}
      AND transactions.is_paid = true
      AND transactions.type = ${input.type}
      AND ${categoryClause}
      AND ${bucket} BETWEEN ${input.from}::date AND ${input.to}::date
    ORDER BY transactions.date DESC, transactions.created_at DESC
  `);

  return {
    ok: true,
    data: rows.map((r) => ({
      id: r.id as string,
      date: r.date as string,
      description: (r.description as string | null) ?? "",
      amountCents: Number(r.amount_cents),
      type: r.type as "income" | "expense",
      accountName: (r.account_name as string | null) ?? null,
      cardName: (r.card_name as string | null) ?? null,
      installmentNumber: (r.installment_number as number | null) ?? null,
      installmentTotal: (r.installment_total as number | null) ?? null,
    })),
  };
}
