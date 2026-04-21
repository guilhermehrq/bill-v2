import { ComingSoon } from "@/features/nav/coming-soon";

export const metadata = { title: "Contas · FinPessoal" };

export default function ContasPage() {
  return (
    <ComingSoon
      title="Contas"
      phase={2}
      description="CRUD de contas bancárias com saldo calculado."
    />
  );
}
