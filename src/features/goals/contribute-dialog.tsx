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
import { toCents } from "@/lib/money";
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
  const [amountText, setAmountText] = useState("");

  useEffect(() => {
    if (!open) return;
    setAmountText("");
    setError(null);
  }, [open]);

  function handleSubmit() {
    setError(null);
    const parsed = Number.parseFloat(amountText.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Valor precisa ser maior que zero");
      return;
    }
    if (!goalId) return;

    startTransition(async () => {
      const result = await contributeGoalAction({ goalId, amountCents: toCents(parsed) });
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
          <Input
            id="amount"
            inputMode="decimal"
            placeholder="0,00"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
            className="tabular"
            autoFocus
          />
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
