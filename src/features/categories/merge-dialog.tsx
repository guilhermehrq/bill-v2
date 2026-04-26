"use client";

import { useState, useTransition } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mergeCategoryAction } from "./actions";

type Candidate = {
  id: string;
  name: string;
  type: "income" | "expense";
  transactionCount: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: Candidate | null;
  candidates: Candidate[];
};

export function MergeDialog({ open, onOpenChange, source, candidates }: Props) {
  const [targetId, setTargetId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!source) return null;

  const targets = candidates.filter((c) => c.id !== source.id && c.type === source.type);

  function handleConfirm() {
    if (!targetId || !source) return;
    setError(null);
    startTransition(async () => {
      const result = await mergeCategoryAction({ sourceId: source.id, targetId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(`"${source.name}" mesclada com sucesso`);
      onOpenChange(false);
      setTargetId(null);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mesclar categoria</DialogTitle>
          <DialogDescription>
            Todas as transações de <strong>{source.name}</strong> ({source.transactionCount}) serão
            movidas para a categoria destino. Subcategorias também serão re-vinculadas. A origem
            será excluída.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="target">Mover para</Label>
          <Select
            value={targetId ?? undefined}
            onValueChange={setTargetId}
            items={targets.map((c) => ({ value: c.id, label: c.name }))}
          >
            <SelectTrigger id="target">
              <SelectValue placeholder="Selecione a categoria destino" />
            </SelectTrigger>
            <SelectContent>
              {targets.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!targetId || isPending}>
            {isPending ? "Mesclando..." : "Mesclar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
