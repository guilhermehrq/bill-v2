import { ComingSoon } from "@/features/nav/coming-soon";

export const metadata = { title: "Cartões · FinPessoal" };

export default function CartoesPage() {
  return (
    <ComingSoon
      title="Cartões de crédito"
      phase={3}
      description="Cartões, faturas e parcelamentos."
    />
  );
}
