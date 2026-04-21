import { ComingSoon } from "@/features/nav/coming-soon";

export const metadata = { title: "Orçamentos · FinPessoal" };

export default function OrcamentosPage() {
  return (
    <ComingSoon
      title="Orçamentos"
      phase={4}
      description="Orçamento mensal por categoria com alertas."
    />
  );
}
