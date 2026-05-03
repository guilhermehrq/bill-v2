import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { DEFAULT_SETTINGS, type UserSettings } from "./constants";

export {
  CREDIT_CARD_MODE_LABELS,
  STATEMENT_VIEW_MODE_LABELS,
  type CreditCardReportMode,
  type StatementViewMode,
  type UserSettings,
} from "./constants";

// Loads the user's settings. The trg_create_user_settings_on_signup trigger
// guarantees a row exists per user, but we return defaults defensively if missing.
export async function getUserSettings(userId: string): Promise<UserSettings> {
  const [row] = await db
    .select({
      creditCardReportMode: userSettings.creditCardReportMode,
      statementViewMode: userSettings.statementViewMode,
      theme: userSettings.theme,
      density: userSettings.density,
      timezone: userSettings.timezone,
      locale: userSettings.locale,
      notificationsLastSeenAt: userSettings.notificationsLastSeenAt,
      budgetAlertThresholds: userSettings.budgetAlertThresholds,
      showBudgetForecasts: userSettings.showBudgetForecasts,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  if (!row) return DEFAULT_SETTINGS;

  return {
    creditCardReportMode: row.creditCardReportMode,
    statementViewMode: row.statementViewMode,
    theme: row.theme,
    density: row.density,
    timezone: row.timezone,
    locale: row.locale,
    notificationsLastSeenAt: row.notificationsLastSeenAt
      ? row.notificationsLastSeenAt.toISOString()
      : null,
    budgetAlertThresholds: (row.budgetAlertThresholds ?? []).map((n) => Number(n)),
    showBudgetForecasts: row.showBudgetForecasts,
  };
}
