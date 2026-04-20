import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import packageJson from "../../package.json";

export default function Home() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-3xl">FinPessoal</CardTitle>
          <CardDescription>Controle financeiro pessoal · em construção</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>Fase 0 — fundação e setup.</p>
          <p className="tabular">
            Versão <span className="font-mono">{packageJson.version}</span>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
