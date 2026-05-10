import { sql, type SQL } from "drizzle-orm";
import { transactions } from "@/db/schema";

// SQL fragment that matches credit-card invoice-payment rows. These are
// control transactions on the bank account side that mirror an invoice — the
// real expenses are the underlying card purchases, so any income/expense
// aggregation should exclude them to avoid double-counting.
//
// Three signals identify a bill payment:
//   1. The `pagamento-fatura` tag — set by the in-app "Pagar fatura" flow.
//   2. An account-side expense with NULL category whose description matches
//      "Pagamento ... fatura ..." — set by the Organizze importer when the
//      source category was "Pagamento de fatura".
//   3. An account-side expense with NULL category whose description starts
//      with "Fatura " — synthetic invoice rows from the importer that the
//      dedup script didn't collapse (typically when paid amount diverged
//      from invoice total due to interest/fees).
export function invoicePaymentMatch(): SQL<boolean> {
  return sql<boolean>`(
    ${transactions.tags} @> ARRAY['pagamento-fatura']::text[]
    OR (
      ${transactions.categoryId} IS NULL
      AND ${transactions.accountId} IS NOT NULL
      AND ${transactions.type} = 'expense'
      AND (
        ${transactions.description} ILIKE 'Pagamento%fatura%'
        OR ${transactions.description} ~* '^Fatura\\s'
      )
    )
  )`;
}

export function notInvoicePayment(): SQL<boolean> {
  return sql<boolean>`NOT ${invoicePaymentMatch()}`;
}

// Same predicate as a raw SQL fragment for queries built with db.execute(sql`...`).
// References transactions columns by their physical names so it can be inlined
// inside a hand-written SELECT without table aliases.
export const NOT_INVOICE_PAYMENT_SQL = sql`NOT (
  transactions.tags @> ARRAY['pagamento-fatura']::text[]
  OR (
    transactions.category_id IS NULL
    AND transactions.account_id IS NOT NULL
    AND transactions.type = 'expense'
    AND (
      transactions.description ILIKE 'Pagamento%fatura%'
      OR transactions.description ~* '^Fatura\\s'
    )
  )
)`;
