import { dinero } from "dinero.js";
import type { Dinero } from "dinero.js";
import { BRL } from "@dinero.js/currencies";

export type TransactionType = "income" | "expense" | "transfer";

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function toReais(cents: number): number {
  return cents / 100;
}

export function createMoney(cents: number): Dinero<number> {
  return dinero({ amount: cents, currency: BRL });
}

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function format(cents: number): string {
  return brlFormatter.format(toReais(cents));
}

export function formatWithSign(cents: number, type: TransactionType): string {
  const formatted = format(cents);
  if (type === "income") return `+ ${formatted}`;
  if (type === "expense") return `- ${formatted}`;
  return formatted;
}
