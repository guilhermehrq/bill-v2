export type CreditCardReportMode = "invoice_date" | "purchase_date" | "installment_date";

export type UserSettings = {
  creditCardReportMode: CreditCardReportMode;
  theme: "system" | "light" | "dark";
  density: "comfortable" | "compact";
  timezone: string;
  locale: string;
};

export const DEFAULT_SETTINGS: UserSettings = {
  creditCardReportMode: "purchase_date",
  theme: "system",
  density: "comfortable",
  timezone: "America/Sao_Paulo",
  locale: "pt-BR",
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
