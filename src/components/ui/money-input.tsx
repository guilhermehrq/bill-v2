"use client";

import * as React from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

type Props = Omit<React.ComponentProps<"input">, "value" | "onChange" | "type" | "inputMode"> & {
  valueCents: number;
  onChange: (cents: number) => void;
  allowNegative?: boolean;
  currency?: string;
};

const formatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function format(cents: number, currency: string): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const reais = abs / 100;
  return `${negative ? "-" : ""}${currency} ${formatter.format(reais)}`;
}

function parse(input: string, allowNegative: boolean): number {
  const negative = allowNegative && input.trim().startsWith("-");
  const digits = input.replace(/\D/g, "");
  if (!digits) return 0;
  const cents = Number.parseInt(digits, 10);
  if (!Number.isFinite(cents)) return 0;
  return negative ? -cents : cents;
}

export function MoneyInput({
  valueCents,
  onChange,
  allowNegative = false,
  currency = "R$",
  className,
  onBlur,
  ...rest
}: Props) {
  const [text, setText] = React.useState(() => format(valueCents, currency));
  const lastEmittedCents = React.useRef(valueCents);

  React.useEffect(() => {
    if (valueCents !== lastEmittedCents.current) {
      setText(format(valueCents, currency));
      lastEmittedCents.current = valueCents;
    }
  }, [valueCents, currency]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const cents = parse(raw, allowNegative);
    lastEmittedCents.current = cents;
    setText(format(cents, currency));
    onChange(cents);
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    setText(format(valueCents, currency));
    onBlur?.(e);
  }

  return (
    <Input
      {...rest}
      type="text"
      inputMode="numeric"
      value={text}
      onChange={handleChange}
      onBlur={handleBlur}
      className={cn("tabular", className)}
    />
  );
}
