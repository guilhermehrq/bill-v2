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
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { contributeGoalAction } from "./actions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: string | null;
  goalName: string | null;
};

export function ContributeDialog({ open, onOpenChange, goalId, goalName }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [amountCents, setAmountCents] = useState(0);

  useEffect(() => {
    if (!open) return;
    setAmountCents(0);
    setError(null);
  }, [open]);

  function handleSubmit() {
    setError(null);
    if (amountCents <= 0) {
      setError("Valor precisa ser maior que zero");
      return;
    }
    if (!goalId) return;

    startTransition(async () => {
      const result = await contributeGoalAction({ goalId, amountCents });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Aporte registrado");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aporte manual</DialogTitle>
          <DialogDescription>
            Adicionar valor à meta <strong>{goalName}</strong>.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="amount">Valor</Label>
          <MoneyInput id="amount" valueCents={amountCents} onChange={setAmountCents} autoFocus />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Salvando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
