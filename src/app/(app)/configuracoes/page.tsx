import { ComingSoon } from "@/features/nav/coming-soon";

export const metadata = { title: "Configurações · FinPessoal" };

export default function ConfiguracoesPage() {
  return (
    <ComingSoon
      title="Configurações"
      phase={5}
      description="Perfil, aparência, modo de exibição de cartão, exportação de dados."
    />
  );
}
