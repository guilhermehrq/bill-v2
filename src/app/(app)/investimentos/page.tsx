import { ComingSoon } from "@/features/nav/coming-soon";

export const metadata = { title: "Investimentos · FinPessoal" };

export default function InvestimentosPage() {
  return (
    <ComingSoon
      title="Investimentos"
      phase={5}
      description="Tracking manual de ativos e movimentações."
    />
  );
}
