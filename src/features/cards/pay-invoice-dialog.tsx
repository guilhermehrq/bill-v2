"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toCents, toReais, format } from "@/lib/money";
import { payInvoiceAction } from "./invoice-actions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  totalCents: number;
  paidCents: number;
  dueDate: string;
  defaultAccountId: string | null;
  accounts: Array<{ id: string; name: string }>;
};

export function PayInvoiceDialog({
  open,
  onOpenChange,
  invoiceId,
  totalCents,
  paidCents,
  dueDate,
  defaultAccountId,
  accounts,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [amountText, setAmountText] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const remainingCents = totalCents - paidCents;

  useEffect(() => {
    if (!open) return;
    setAccountId(defaultAccountId ?? accounts[0]?.id ?? null);
    setAmountText(toReais(remainingCents).toFixed(2).replace(".", ","));
    setDate(dueDate);
    setError(null);
  }, [open, defaultAccountId, accounts, remainingCents, dueDate]);

  function handleSubmit() {
    setError(null);
    const parsed = Number.parseFloat(amountText.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Valor inválido");
      return;
    }
    if (!accountId) {
      setError("Escolha a conta de débito");
      return;
    }
    const amountCents = toCents(parsed);
    if (amountCents > remainingCents) {
      setError("Valor maior que o saldo devedor");
      return;
    }

    startTransition(async () => {
      const result = await payInvoiceAction({
        invoiceId,
        accountId,
        amountCents,
        date,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(
        amountCents === remainingCents
          ? "Fatura paga integralmente"
          : "Pagamento parcial registrado",
      );
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pagar fatura</DialogTitle>
          <DialogDescription>
            Saldo devedor: <strong>{format(remainingCents)}</strong> (total {format(totalCents)},
            pago {format(paidCents)}).
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="account">Pagar com</Label>
            <Select value={accountId ?? undefined} onValueChange={(v) => setAccountId(v)}>
              <SelectTrigger id="account">
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor</Label>
            <Input
              id="amount"
              inputMode="decimal"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              className="tabular"
            />
            <p className="text-muted-foreground text-xs">
              Digite um valor menor para pagamento parcial.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Data do pagamento</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Confirmando..." : "Pagar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
