"use client";

import { Bell, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateUserSettingsAction } from "@/features/settings/actions";

type Props = {
  thresholds: number[];
};

const QUICK_PRESETS = [
  { label: "50, 80, 100%", values: [50, 80, 100] },
  { label: "80, 100%", values: [80, 100] },
  { label: "Apenas 100%", values: [100] },
];

export function BudgetAlertSettings({ thresholds }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<number[]>(thresholds);
  const [newValue, setNewValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const isDirty =
    draft.length !== thresholds.length ||
    draft.some((v, i) => v !== [...thresholds].sort((a, b) => a - b)[i]);

  function addThreshold() {
    const n = Number.parseInt(newValue, 10);
    if (!Number.isFinite(n) || n < 1 || n > 200) {
      toast.error("Valor inválido (1 a 200)");
      return;
    }
    if (draft.includes(n)) {
      setNewValue("");
      return;
    }
    setDraft((prev) => [...prev, n].sort((a, b) => a - b));
    setNewValue("");
  }

  function removeThreshold(value: number) {
    setDraft((prev) => prev.filter((v) => v !== value));
  }

  function applyPreset(values: number[]) {
    setDraft([...values]);
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateUserSettingsAction({ budgetAlertThresholds: draft });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Alertas atualizados");
      router.refresh();
    });
  }

  return (
    <Card className="p-4">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left"
      >
        <Bell className="text-muted-foreground size-4" />
        <div className="flex-1">
          <p className="text-sm font-medium">Alertas de orçamento</p>
          <p className="text-muted-foreground text-xs">
            Avisar quando uma categoria atingir{" "}
            {thresholds.length === 0
              ? "(nenhum alerta configurado)"
              : thresholds.map((t) => `${t}%`).join(", ")}
            .
          </p>
        </div>
        <span className="text-muted-foreground text-xs">{isOpen ? "ocultar" : "configurar"}</span>
      </button>

      {isOpen && (
        <div className="mt-4 space-y-3 border-t pt-4">
          <div>
            <Label className="text-xs">Sugestões rápidas</Label>
            <div className="mt-1 flex flex-wrap gap-1">
              {QUICK_PRESETS.map((p) => (
                <Button
                  key={p.label}
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => applyPreset(p.values)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Limites configurados</Label>
            <div className="mt-1 flex flex-wrap gap-1">
              {draft.length === 0 ? (
                <span className="text-muted-foreground text-xs">Nenhum alerta — desativado.</span>
              ) : (
                draft.map((v) => (
                  <span
                    key={v}
                    className="bg-secondary inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs"
                  >
                    {v}%
                    <button
                      type="button"
                      onClick={() => removeThreshold(v)}
                      className="hover:text-destructive"
                      aria-label={`Remover alerta de ${v}%`}
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="threshold-add" className="text-xs">
                Adicionar % personalizado
              </Label>
              <Input
                id="threshold-add"
                type="number"
                min={1}
                max={200}
                placeholder="ex: 75"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addThreshold();
                  }
                }}
              />
            </div>
            <Button type="button" variant="outline" onClick={addThreshold}>
              <Plus className="size-4" />
            </Button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => setDraft(thresholds)}
              disabled={!isDirty || isPending}
            >
              Desfazer
            </Button>
            <Button onClick={handleSave} disabled={!isDirty || isPending}>
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
