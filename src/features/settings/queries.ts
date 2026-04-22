import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userSettings } from "@/db/schema";

export type CreditCardReportMode = "invoice_date" | "purchase_date" | "installment_date";

export type UserSettings = {
  creditCardReportMode: CreditCardReportMode;
  theme: "system" | "light" | "dark";
  density: "comfortable" | "compact";
  timezone: string;
  locale: string;
};

const DEFAULT_SETTINGS: UserSettings = {
  creditCardReportMode: "purchase_date",
  theme: "system",
  density: "comfortable",
  timezone: "America/Sao_Paulo",
  locale: "pt-BR",
};

// Loads the user's settings. The trg_create_user_settings_on_signup trigger
// guarantees a row exists per user, but we return defaults defensively if missing.
export async function getUserSettings(userId: string): Promise<UserSettings> {
  const [row] = await db
    .select({
      creditCardReportMode: userSettings.creditCardReportMode,
      theme: userSettings.theme,
      density: userSettings.density,
      timezone: userSettings.timezone,
      locale: userSettings.locale,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  if (!row) return DEFAULT_SETTINGS;

  return {
    creditCardReportMode: row.creditCardReportMode,
    theme: row.theme,
    density: row.density,
    timezone: row.timezone,
    locale: row.locale,
  };
}

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
