import { ComingSoon } from "@/features/nav/coming-soon";

export const metadata = { title: "Importar · FinPessoal" };

export default function ImportarPage() {
  return (
    <ComingSoon
      title="Importador de transações"
      phase="2.5"
      description="Wizard de 7 passos com presets Organizze, Mobills, OFX, CSV genérico."
    />
  );
}
