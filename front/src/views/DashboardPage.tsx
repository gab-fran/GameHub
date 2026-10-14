"use client";

import { useEffect, useState } from "react";
import { MetricCard } from "@/components/MetricCard";
import { apiRequest } from "@/fetch/api";

interface DashboardDTO {
  totalProducts: number;
  lowStock: number;
  inventoryValue: number;
  categories: number;
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardDTO | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<DashboardDTO>("/dashboard")
      .then(setData)
      .catch((requestError: unknown) => {
        setError(requestError instanceof Error ? requestError.message : "Erro ao carregar dashboard.");
      });
  }, []);

  if (error) return <p className="form-error">{error}</p>;
  if (!data) return <p className="state-message">Carregando indicadores...</p>;

  return (
    <section>
      <span className="eyebrow">VISÃO GERAL</span>
      <h1>Dashboard</h1>
      <p className="section-intro">Indicadores atuais do catálogo GameHub.</p>
      <div className="metrics-grid">
        <MetricCard label="Produtos" value={String(data.totalProducts)} description="Itens cadastrados" />
        <MetricCard label="Estoque baixo" value={String(data.lowStock)} description="Cinco unidades ou menos" />
        <MetricCard label="Categorias" value={String(data.categories)} description="Categorias disponíveis" />
        <MetricCard label="Valor em estoque" value={data.inventoryValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} description="Preço × quantidade" />
      </div>
    </section>
  );
}
