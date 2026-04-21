"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { signupAction } from "./actions";
import { GoogleButton } from "./google-button";
import { signupSchema, type SignupInput } from "./schemas";

export function SignupForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "", terms: false as unknown as true },
  });

  function onSubmit(data: SignupInput) {
    setFormError(null);
    setSuccessMessage(null);
    startTransition(async () => {
      const result = await signupAction(data);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      setSuccessMessage(
        "Conta criada. Confira seu email para confirmar o cadastro antes de entrar.",
      );
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      {successMessage && (
        <Alert>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" autoComplete="name" {...register("name")} />
        {errors.name && <p className="text-expense text-sm">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" {...register("email")} />
        {errors.email && <p className="text-expense text-sm">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          {...register("password")}
        />
        {errors.password ? (
          <p className="text-expense text-sm">{errors.password.message}</p>
        ) : (
          <p className="text-muted-foreground text-xs">Mínimo 8 caracteres</p>
        )}
      </div>

      <div className="flex items-start gap-2">
        <Controller
          control={control}
          name="terms"
          render={({ field }) => (
            <Checkbox
              id="terms"
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
            />
          )}
        />
        <Label htmlFor="terms" className="text-sm leading-tight font-normal">
          Aceito os termos de uso e política de privacidade
        </Label>
      </div>
      {errors.terms && <p className="text-expense text-sm">{errors.terms.message}</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Criando conta..." : "Criar conta"}
      </Button>

      <div className="flex items-center gap-3 py-2">
        <Separator className="flex-1" />
        <span className="text-muted-foreground text-xs">ou continue com</span>
        <Separator className="flex-1" />
      </div>

      <GoogleButton />

      <p className="text-muted-foreground text-center text-sm">
        Já tem conta?{" "}
        <Link href="/login" className="text-foreground font-medium hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
