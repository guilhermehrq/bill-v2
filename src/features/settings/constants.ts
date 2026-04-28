export type CreditCardReportMode = "invoice_date" | "purchase_date" | "installment_date";
export type StatementViewMode = "cashflow" | "all_entries";

export type UserSettings = {
  creditCardReportMode: CreditCardReportMode;
  statementViewMode: StatementViewMode;
  theme: "system" | "light" | "dark";
  density: "comfortable" | "compact";
  timezone: string;
  locale: string;
};

export const DEFAULT_SETTINGS: UserSettings = {
  creditCardReportMode: "purchase_date",
  statementViewMode: "all_entries",
  theme: "system",
  density: "comfortable",
  timezone: "America/Sao_Paulo",
  locale: "pt-BR",
};

export const STATEMENT_VIEW_MODE_LABELS: Record<
  StatementViewMode,
  { label: string; short: string; description: string }
> = {
  cashflow: {
    label: "Fluxo de caixa",
    short: "fluxo de caixa",
    description:
      "Apenas lançamentos que afetam seu saldo. Compras de cartão somem; faturas e pagamentos aparecem.",
  },
  all_entries: {
    label: "Todos os lançamentos",
    short: "todos os lançamentos",
    description:
      "Tudo que você lançou, incluindo compras individuais no cartão. Faturas e pagamentos não aparecem para evitar duplicação.",
  },
};

export const CREDIT_CARD_MODE_LABELS: Record<
  CreditCardReportMode,
  { label: string; short: string; description: string }
> = {
  invoice_date: {
    label: "Data da fatura",
    short: "por data da fatura",
    description:
      "Compras aparecem no mês em que a fatura fecha. Ideal para conferir com seu extrato bancário.",
  },
  purchase_date: {
    label: "Data da compra",
    short: "por data da compra",
    description:
      "Compras aparecem no mês em que foram feitas. Parcelamentos contam o valor total no mês da compra.",
  },
  installment_date: {
    label: "Data da parcela",
    short: "por data da parcela",
    description:
      "Cada parcela conta no mês em que será cobrada. Útil para projetar fluxo de caixa.",
  },
};
