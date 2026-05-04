"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { IconPicker } from "@/components/ui/icon-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { createCategoryAction, updateCategoryAction } from "./actions";
import { createCategorySchema, type CreateCategoryInput } from "./schemas";

const PALETTE = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#14b8a6",
  "#0ea5e9",
  "#64748b",
];

type Parent = { id: string; name: string; type: "income" | "expense" };

type Existing = {
  id: string;
  name: string;
  type: "income" | "expense";
  parentId: string | null;
  icon: string | null;
  color: string | null;
  isSystem: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Existing | null;
  parentOptions: Parent[];
  defaultType: "income" | "expense";
  defaultParentId?: string | null;
};

export function CategoryForm({
  open,
  onOpenChange,
  category,
  parentOptions,
  defaultType,
  defaultParentId,
}: Props) {
  const isEdit = category != null;
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: "",
      type: defaultType,
      parentId: defaultParentId ?? null,
      icon: "",
      color: PALETTE[0],
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: category?.name ?? "",
        type: category?.type ?? defaultType,
        parentId: category?.parentId ?? defaultParentId ?? null,
        icon: category?.icon ?? "",
        color: category?.color ?? PALETTE[0],
      });
      setFormError(null);
    }
  }, [open, category, defaultType, defaultParentId, reset]);

  const selectedType = watch("type");
  const selectedColor = watch("color");
  const selectedParent = watch("parentId");
  const selectedIcon = watch("icon");

  const availableParents = parentOptions.filter((p) => p.type === selectedType);
  const isParent = !selectedParent;

  function onSubmit(values: CreateCategoryInput) {
    setFormError(null);
    startTransition(async () => {
      const result = isEdit
        ? await updateCategoryAction(category!.id, values)
        : await createCategoryAction(values);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      toast.success(isEdit ? "Categoria atualizada" : "Categoria criada");
      onOpenChange(false);
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar categoria" : "Nova categoria"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Edite o nome, ícone e cor. Tipo e pai ficam fixos após a criação."
              : "Crie uma categoria de receita ou despesa, opcionalmente dentro de uma existente."}
          </SheetDescription>
        </SheetHeader>

        <form
          id="category-form"
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
            <Input id="name" placeholder="Ex: Assinaturas" {...register("name")} autoFocus />
            {errors.name && <p className="text-expense text-sm">{errors.name.message}</p>}
          </div>

          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select
                value={selectedType}
                onValueChange={(v) => setValue("type", v as "income" | "expense")}
                items={[
                  { value: "expense", label: "Despesa" },
                  { value: "income", label: "Receita" },
                ]}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="income">Receita</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="parent">Subcategoria de (opcional)</Label>
              <Select
                value={selectedParent ?? "none"}
                onValueChange={(v) => setValue("parentId", v === "none" ? null : v)}
                items={[
                  { value: "none", label: "Nenhuma — categoria raiz" },
                  ...availableParents.map((p) => ({ value: p.id, label: p.name })),
                ]}
              >
                <SelectTrigger id="parent">
                  <SelectValue placeholder="Nenhuma — categoria raiz" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma — categoria raiz</SelectItem>
                  {availableParents.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isParent && (
            <div className="space-y-2">
              <Label>Ícone</Label>
              <div className="flex items-center gap-3">
                <IconPicker
                  value={selectedIcon ?? null}
                  onChange={(icon) => setValue("icon", icon ?? "")}
                  color={selectedColor ?? null}
                />
                <p className="text-muted-foreground text-xs">
                  Aparece em listagens de transação e relatórios.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((color) => (
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
          </div>
        </form>

        <SheetFooter className="flex-row justify-end gap-2 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="category-form" disabled={isPending}>
            {isPending ? "Salvando..." : isEdit ? "Salvar" : "Criar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
