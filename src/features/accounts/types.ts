export const ACCOUNT_TYPES = [
  { value: "checking", label: "Corrente" },
  { value: "savings", label: "Poupança" },
  { value: "cash", label: "Dinheiro / Carteira" },
  { value: "investment", label: "Investimento" },
  { value: "other", label: "Outra" },
] as const;

export type AccountTypeValue = (typeof ACCOUNT_TYPES)[number]["value"];

export const DEFAULT_ACCOUNT_COLOR = "#6366f1";
export const DEFAULT_ACCOUNT_ICON = "wallet";

export const ACCOUNT_COLOR_PALETTE = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#14b8a6",
  "#0ea5e9",
  "#64748b",
  "#0f172a",
];

export const ACCOUNT_ICON_OPTIONS = [
  "wallet",
  "landmark",
  "piggy-bank",
  "credit-card",
  "banknote",
  "coins",
] as const;
