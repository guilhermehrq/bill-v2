"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AccountIconPicker } from "@/components/ui/account-icon-picker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { createAccountAction, updateAccountAction } from "./actions";
import { accountFormSchema, type AccountFormValues, type CreateAccountInput } from "./schemas";
import {
  ACCOUNT_COLOR_PALETTE,
  ACCOUNT_TYPES,
  DEFAULT_ACCOUNT_COLOR,
  DEFAULT_ACCOUNT_ICON,
} from "./types";

type ExistingAccount = {
  id: string;
  name: string;
  type: string;
  institution: string | null;
  initialBalanceCents: number;
  color: string | null;
  icon: string | null;
  includeInTotalBalance: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: ExistingAccount | null;
  onSaved?: () => void;
};

export function AccountForm({ open, onOpenChange, account, onSaved }: Props) {
  const isEdit = account != null;
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: "",
      type: "checking",
      institution: "",
      initialBalanceCents: 0,
      color: DEFAULT_ACCOUNT_COLOR,
      icon: DEFAULT_ACCOUNT_ICON,
      includeInTotalBalance: true,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: account?.name ?? "",
        type: (account?.type ?? "checking") as CreateAccountInput["type"],
        institution: account?.institution ?? "",
        initialBalanceCents: account?.initialBalanceCents ?? 0,
        color: account?.color ?? DEFAULT_ACCOUNT_COLOR,
        icon: account?.icon ?? DEFAULT_ACCOUNT_ICON,
        includeInTotalBalance: account?.includeInTotalBalance ?? true,
      });
      setFormError(null);
    }
  }, [open, account, reset]);

  function onSubmit(values: AccountFormValues) {
    const payload: CreateAccountInput = {
      name: values.name,
      type: values.type,
      institution: values.institution || undefined,
      initialBalanceCents: values.initialBalanceCents,
      color: values.color,
      icon: values.icon,
      includeInTotalBalance: values.includeInTotalBalance,
    };

    setFormError(null);
    startTransition(async () => {
      const result = isEdit
        ? await updateAccountAction(account!.id, payload)
        : await createAccountAction(payload);

      if (!result.ok) {
        setFormError(result.error);
        return;
      }

      toast.success(isEdit ? "Conta atualizada" : "Conta criada");
      onOpenChange(false);
      onSaved?.();
    });
  }

  const selectedColor = watch("color");
  const selectedIcon = watch("icon");
  const includeInTotal = watch("includeInTotalBalance");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar conta" : "Nova conta"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "Ajuste os dados da conta." : "Cadastre uma nova conta para acompanhar."}
          </SheetDescription>
        </SheetHeader>

        <form
          id="account-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4"
        >
          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" placeholder="Ex: Conta Itaú" {...register("name")} autoFocus />
            {errors.name && <p className="text-expense text-sm">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select
              value={watch("type")}
              onValueChange={(v) => setValue("type", v as CreateAccountInput["type"])}
              items={ACCOUNT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="institution">Instituição (opcional)</Label>
            <Input
              id="institution"
              placeholder="Ex: Itaú, Nubank, ..."
              {...register("institution")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="initialBalance">Saldo inicial</Label>
            <MoneyInput
              id="initialBalance"
              valueCents={watch("initialBalanceCents")}
              onChange={(cents) => setValue("initialBalanceCents", cents)}
              allowNegative
            />
            <p className="text-muted-foreground text-xs">Pode ser negativo.</p>
          </div>

          <div className="space-y-2">
            <Label>Ícone</Label>
            <AccountIconPicker
              value={selectedIcon ?? null}
              onChange={(icon) => setValue("icon", icon ?? "")}
              color={selectedColor ?? null}
            />
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {ACCOUNT_COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setValue("color", color)}
                  className={cn(
                    "size-7 rounded-full border-2 transition-transform hover:scale-110",
                    selectedColor === color ? "border-foreground" : "border-transparent",
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={`Cor ${color}`}
                />
              ))}
            </div>
            <p className="text-muted-foreground text-xs">
              Usada quando o ícone é genérico. Logos de instituição mantêm sua cor original.
            </p>
          </div>

          <div className="rounded-md border p-3">
            <div className="flex items-start gap-2">
              <Checkbox
                id="includeInTotal"
                checked={includeInTotal}
                onCheckedChange={(v) => setValue("includeInTotalBalance", v === true)}
                className="mt-0.5"
              />
              <div className="flex-1 space-y-1">
                <Label htmlFor="includeInTotal" className="cursor-pointer text-sm font-medium">
                  Incluir no saldo total
                </Label>
                <p className="text-muted-foreground text-xs">
                  Quando desmarcado, esta conta não conta no &ldquo;Saldo total&rdquo; do dashboard
                  (útil para reservas e investimentos que você não quer somar ao seu caixa do
                  dia-a-dia).
                </p>
              </div>
            </div>
          </div>
        </form>

        <SheetFooter className="flex-row justify-end gap-2 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="account-form" disabled={isPending}>
            {isPending ? "Salvando..." : isEdit ? "Salvar" : "Criar conta"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
