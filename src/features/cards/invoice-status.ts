// Derives a user-facing label for an invoice based on the persisted DB status
// plus the card's closing day. The 4 user-facing labels are:
//
//   - Paga    (paidCents >= totalCents AND totalCents > 0)
//   - Parcial (0 < paidCents < totalCents)
//   - Atual   (unpaid AND reference_month corresponds to today's open billing cycle)
//   - Futura  (unpaid AND reference_month is after the current billing cycle)
//   - Atrasada (unpaid AND reference_month is BEFORE the current cycle)
//
// The current billing cycle's reference month is derived from today and the card's
// closing day: if today's day-of-month is <= closingDay, the open cycle is the
// current calendar month; otherwise it's the next month.

export type DerivedInvoiceStatus = "paid" | "partial" | "current" | "future" | "overdue";

export const INVOICE_STATUS_LABEL: Record<DerivedInvoiceStatus, string> = {
  paid: "Paga",
  partial: "Parcial",
  current: "Atual",
  future: "Futura",
  overdue: "Atrasada",
};

export function getCurrentCycleRefMonth(closingDay: number, today = new Date()): string {
  const d = today.getDate();
  let year = today.getFullYear();
  let month = today.getMonth() + 1; // 1-12
  if (d > closingDay) {
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

type InvoiceLite = {
  paidCents: number;
  totalCents: number;
  referenceMonth: string; // YYYY-MM-DD
};

export function deriveInvoiceStatus(
  invoice: InvoiceLite,
  closingDay: number,
): DerivedInvoiceStatus {
  const paid = invoice.paidCents;
  const total = invoice.totalCents;
  if (paid >= total && total > 0) return "paid";
  if (paid > 0 && paid < total) return "partial";

  const cycleRef = getCurrentCycleRefMonth(closingDay).slice(0, 7); // YYYY-MM
  const invRef = invoice.referenceMonth.slice(0, 7);
  if (invRef === cycleRef) return "current";
  if (invRef > cycleRef) return "future";
  return "overdue";
}
