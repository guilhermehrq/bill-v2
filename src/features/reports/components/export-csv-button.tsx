"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ReportData } from "../queries";

type Props = {
  data: ReportData;
  periodLabel: string;
};

export function ExportCsvButton({ data, periodLabel }: Props) {
  function handleClick() {
    try {
      const csv = buildCsv(data);
      const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `relatorio-${data.from}-a-${data.to}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("CSV exportado");
    } catch (e) {
      toast.error(`Falha ao exportar: ${e instanceof Error ? e.message : "erro desconhecido"}`);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      aria-label={`Exportar relatório de ${periodLabel} em CSV`}
    >
      <Download className="size-4" aria-hidden />
      Exportar CSV
    </Button>
  );
}

function buildCsv(data: ReportData): string {
  const lines: string[] = [];
  lines.push("Relatório,Período,Início,Fim");
  lines.push(`"FinPessoal","${data.from} a ${data.to}","${data.from}","${data.to}"`);
  lines.push("");

  lines.push("Resumo");
  lines.push("Receitas,Despesas,Saldo,Transações");
  lines.push(
    [
      formatBrl(data.summary.incomeCents),
      formatBrl(data.summary.expenseCents),
      formatBrl(data.summary.netCents),
      data.summary.transactionCount,
    ].join(","),
  );
  lines.push("");

  lines.push("Despesas por categoria");
  lines.push("Categoria,Subcategoria,Total,Transações,% do total");
  const totalExpense = data.summary.expenseCents || 1;
  for (const row of data.byCategory) {
    const [parent, sub] = row.parentName ? [row.parentName, row.name] : [row.name, ""];
    const pct = ((row.totalCents / totalExpense) * 100).toFixed(1);
    lines.push(
      [csvField(parent), csvField(sub), formatBrl(row.totalCents), row.count, pct].join(","),
    );
  }
  lines.push("");

  lines.push("Evolução mensal");
  lines.push("Mês,Receitas,Despesas,Saldo");
  for (const row of data.evolution) {
    lines.push(
      [
        row.month,
        formatBrl(row.incomeCents),
        formatBrl(row.expenseCents),
        formatBrl(row.netCents),
      ].join(","),
    );
  }

  return lines.join("\n");
}

function csvField(value: string): string {
  const safe = value.replace(/"/g, '""');
  return `"${safe}"`;
}

function formatBrl(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}
