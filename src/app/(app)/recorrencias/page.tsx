import { ComingSoon } from "@/features/nav/coming-soon";

export const metadata = { title: "Recorrências · FinPessoal" };

export default function RecorrenciasPage() {
  return (
    <ComingSoon
      title="Recorrências"
      phase={4}
      description="Modelos de transação recorrente (salário, aluguel, assinaturas)."
    />
  );
}
