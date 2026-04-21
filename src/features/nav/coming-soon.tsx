import { Construction } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  title: string;
  phase: number | string;
  description?: string;
};

export function ComingSoon({ title, phase, description }: Props) {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center py-8">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <Construction className="text-pending mx-auto size-10" aria-hidden />
          <CardTitle className="mt-2">{title}</CardTitle>
          <CardDescription>
            Disponível na <strong>Fase {phase}</strong>.
          </CardDescription>
        </CardHeader>
        {description && (
          <CardContent className="text-muted-foreground text-sm">{description}</CardContent>
        )}
      </Card>
    </div>
  );
}
