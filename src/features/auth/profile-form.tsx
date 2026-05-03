"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfileAction, updatePasswordFromProfileAction } from "./profile-actions";

type Props = {
  initial: {
    name: string;
    email: string;
    avatarUrl: string | null;
    provider: string;
    createdAt: string | null;
  };
};

export function ProfileForm({ initial }: Props) {
  const [name, setName] = useState(initial.name);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl ?? "");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profilePending, startProfileTransition] = useTransition();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwPending, startPwTransition] = useTransition();

  const initials = name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const profileDirty =
    name.trim() !== initial.name || avatarUrl.trim() !== (initial.avatarUrl ?? "");
  const isOAuth = initial.provider !== "email";

  function handleProfileSubmit() {
    setProfileError(null);
    if (name.trim().length < 2) {
      setProfileError("Informe seu nome (mínimo 2 caracteres)");
      return;
    }
    startProfileTransition(async () => {
      const result = await updateProfileAction({
        name: name.trim(),
        avatarUrl: avatarUrl.trim() || null,
      });
      if (!result.ok) {
        setProfileError(result.error);
        return;
      }
      toast.success("Perfil atualizado");
    });
  }

  function handlePasswordSubmit() {
    setPwError(null);
    if (newPassword.length < 8) {
      setPwError("Nova senha precisa ter ao menos 8 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Senhas não conferem");
      return;
    }
    startPwTransition(async () => {
      const result = await updatePasswordFromProfileAction({
        currentPassword,
        newPassword,
      });
      if (!result.ok) {
        setPwError(result.error);
        return;
      }
      toast.success("Senha atualizada");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Perfil</h1>
        <p className="text-muted-foreground text-sm">Seus dados de acesso e identificação.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados pessoais</CardTitle>
          <CardDescription>Visíveis apenas para você dentro do app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profileError && (
            <Alert variant="destructive">
              <AlertDescription>{profileError}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-3">
            <Avatar className="size-14">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
              <AvatarFallback>{initials || "U"}</AvatarFallback>
            </Avatar>
            <div className="text-muted-foreground text-xs">
              <p>
                Email: <span className="text-foreground">{initial.email}</span>
              </p>
              <p>
                Conta:{" "}
                <span className="text-foreground">
                  {initial.provider === "email" ? "Email/senha" : initial.provider}
                </span>
              </p>
              {initial.createdAt && (
                <p>
                  Membro desde:{" "}
                  <span className="text-foreground">{formatDate(initial.createdAt)}</span>
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar">URL da foto (opcional)</Label>
            <Input
              id="avatar"
              type="url"
              placeholder="https://..."
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleProfileSubmit} disabled={!profileDirty || profilePending}>
              {profilePending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {!isOAuth && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alterar senha</CardTitle>
            <CardDescription>Mínimo de 8 caracteres.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pwError && (
              <Alert variant="destructive">
                <AlertDescription>{pwError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="current-password">Senha atual</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar nova senha</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handlePasswordSubmit}
                disabled={pwPending || !currentPassword || !newPassword}
              >
                {pwPending ? "Atualizando..." : "Atualizar senha"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(d);
}
