"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { AccountIconPicker } from "@/components/ui/account-icon-picker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { createCardAction, updateCardAction } from "./actions";
import { CARD_BRANDS, CARD_COLOR_PALETTE, DEFAULT_CARD_COLOR } from "./types";

type AccountOption = { id: string; name: string };

type ExistingCard = {
  id: string;
  name: string;
  brand: string | null;
  limitCents: number;
  closingDay: number;
  dueDay: number;
  defaultAccountId: string | null;
  color: string | null;
  icon: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card?: ExistingCard | null;
  accounts: AccountOption[];
};

export function CardForm({ open, onOpenChange, card, accounts }: Props) {
  const isEdit = card != null;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [brand, setBrand] = useState<string>("");
  const [limitCents, setLimitCents] = useState(0);
  const [closingDay, setClosingDay] = useState<number>(1);
  const [dueDay, setDueDay] = useState<number>(10);
  const [defaultAccountId, setDefaultAccountId] = useState<string | null>(null);
  const [color, setColor] = useState<string>(DEFAULT_CARD_COLOR);
  const [icon, setIcon] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (card) {
      setName(card.name);
      setBrand(card.brand ?? "");
      setLimitCents(card.limitCents);
      setClosingDay(card.closingDay);
      setDueDay(card.dueDay);
      setDefaultAccountId(card.defaultAccountId);
      setColor(card.color ?? DEFAULT_CARD_COLOR);
      setIcon(card.icon ?? null);
    } else {
      setName("");
      setBrand("");
      setLimitCents(0);
      setClosingDay(1);
      setDueDay(10);
      setDefaultAccountId(accounts[0]?.id ?? null);
      setColor(DEFAULT_CARD_COLOR);
      setIcon(null);
    }
    setError(null);
  }, [open, card, accounts]);

  function handleSubmit() {
    setError(null);
    if (limitCents < 0) {
      setError("Limite inválido");
      return;
    }
    if (!name.trim()) {
      setError("Informe um nome");
      return;
    }

    const payload = {
      name: name.trim(),
      brand: brand || undefined,
      limitCents,
      closingDay,
      dueDay,
      defaultAccountId,
      color,
      icon: icon ?? undefined,
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateCardAction(card!.id, payload)
        : await createCardAction(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(isEdit ? "Cartão atualizado" : "Cartão criado");
      onOpenChange(false);
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar cartão" : "Novo cartão"}</SheetTitle>
          <SheetDescription>
            Configure o ciclo (fechamento/vencimento) e a conta que paga a fatura por padrão.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              placeholder="Ex: Nubank, Itaú Black"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand">Bandeira</Label>
            <Select
              value={brand}
              onValueChange={(v) => setBrand(v ?? "")}
              items={CARD_BRANDS.map((b) => ({ value: b.value, label: b.label }))}
            >
              <SelectTrigger id="brand">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {CARD_BRANDS.map((b) => (
                  <SelectItem key={b.value} value={b.value}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Ícone</Label>
            <AccountIconPicker value={icon} onChange={setIcon} color={color} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="limit">Limite</Label>
            <MoneyInput id="limit" valueCents={limitCents} onChange={setLimitCents} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="closing">Dia de fechamento</Label>
              <Input
                id="closing"
                type="number"
                min={1}
                max={31}
                value={closingDay}
                onChange={(e) => setClosingDay(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due">Dia de vencimento</Label>
              <Input
                id="due"
                type="number"
                min={1}
                max={31}
                value={dueDay}
                onChange={(e) => setDueDay(Number(e.target.value))}
              />
            </div>
          </div>

          {accounts.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="defaultAccount">Conta de débito da fatura</Label>
              <Select
                value={defaultAccountId ?? "none"}
                onValueChange={(v) => setDefaultAccountId(v === "none" ? null : v)}
                items={[
                  { value: "none", label: "Selecionar no pagamento" },
                  ...accounts.map((a) => ({ value: a.id, label: a.name })),
                ]}
              >
                <SelectTrigger id="defaultAccount">
                  <SelectValue placeholder="Selecionar no pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecionar no pagamento</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {CARD_COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "size-7 rounded-full border-2 transition-transform hover:scale-110",
                    color === c ? "border-foreground" : "border-transparent",
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
          </div>
        </div>

        <SheetFooter className="flex-row justify-end gap-2 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Salvando..." : isEdit ? "Salvar" : "Criar cartão"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
