"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateUserSettingsAction } from "./actions";
import { CREDIT_CARD_MODE_LABELS, type CreditCardReportMode, type UserSettings } from "./constants";

type Theme = UserSettings["theme"];
type Density = UserSettings["density"];

type Props = {
  initial: UserSettings;
};

export function SettingsForm({ initial }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [creditCardReportMode, setCreditCardReportMode] = useState<CreditCardReportMode>(
    initial.creditCardReportMode,
  );
  const [theme, setTheme] = useState<Theme>(initial.theme);
  const [density, setDensity] = useState<Density>(initial.density);

  const isDirty =
    creditCardReportMode !== initial.creditCardReportMode ||
    theme !== initial.theme ||
    density !== initial.density;

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await updateUserSettingsAction({
        creditCardReportMode,
        theme,
        density,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Preferências atualizadas");
    });
  }

  const modeInfo = CREDIT_CARD_MODE_LABELS[creditCardReportMode];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="text-muted-foreground text-sm">
          Preferências de exibição e cálculo aplicadas ao app inteiro.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cartão de crédito</CardTitle>
          <CardDescription>
            Como as compras e parcelamentos devem ser agrupados nos relatórios e no dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="cc-mode">Modo de exibição</Label>
          <Select
            value={creditCardReportMode}
            onValueChange={(v) => setCreditCardReportMode(v as CreditCardReportMode)}
          >
            <SelectTrigger id="cc-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(
                Object.entries(CREDIT_CARD_MODE_LABELS) as Array<
                  [CreditCardReportMode, (typeof CREDIT_CARD_MODE_LABELS)[CreditCardReportMode]]
                >
              ).map(([value, info]) => (
                <SelectItem key={value} value={value}>
                  {info.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">{modeInfo.description}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aparência</CardTitle>
          <CardDescription>Tema e densidade das listas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="theme">Tema</Label>
            <Select value={theme} onValueChange={(v) => setTheme(v as Theme)}>
              <SelectTrigger id="theme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">Sistema (automático)</SelectItem>
                <SelectItem value="light">Claro</SelectItem>
                <SelectItem value="dark">Escuro</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              A aplicação completa do tema segue na Fase 5 (polish).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="density">Densidade</Label>
            <Select value={density} onValueChange={(v) => setDensity(v as Density)}>
              <SelectTrigger id="density">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comfortable">Confortável</SelectItem>
                <SelectItem value="compact">Compacta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conta e região</CardTitle>
          <CardDescription>Configurações fixas — edição via suporte (ou Fase 5).</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground text-xs uppercase">Moeda</p>
            <p className="text-foreground">Real brasileiro (BRL)</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase">Idioma</p>
            <p className="text-foreground">{initial.locale}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase">Fuso horário</p>
            <p className="text-foreground">{initial.timezone}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={!isDirty || isPending}>
          {isPending ? "Salvando..." : "Salvar preferências"}
        </Button>
      </div>
    </div>
  );
}
