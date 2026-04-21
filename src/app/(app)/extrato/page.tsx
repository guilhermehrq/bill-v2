import { ComingSoon } from "@/features/nav/coming-soon";

export const metadata = { title: "Extrato · FinPessoal" };

export default function ExtratoPage() {
  return (
    <ComingSoon title="Extrato" phase={2} description="CRUD de transações, filtros e busca." />
  );
}
