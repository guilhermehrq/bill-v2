import { ComingSoon } from "@/features/nav/coming-soon";

export const metadata = { title: "Relatórios · FinPessoal" };

export default function RelatoriosPage() {
  return (
    <ComingSoon
      title="Relatórios"
      phase={5}
      description="Treemap por categoria, evolução, comparativo."
    />
  );
}
