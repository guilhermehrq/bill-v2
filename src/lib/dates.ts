import { format as formatFns, parse as parseFns } from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatShort(date: Date): string {
  return formatFns(date, "dd/MM/yyyy", { locale: ptBR });
}

export function formatLong(date: Date): string {
  return formatFns(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

export function formatMonth(date: Date): string {
  return formatFns(date, "MMMM yyyy", { locale: ptBR });
}

export function parseShort(input: string): Date {
  return parseFns(input, "dd/MM/yyyy", new Date());
}
