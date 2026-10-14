"use client";

import { useEffect, useState } from "react";
import { MetricCard } from "@/components/MetricCard";
import { apiRequest } from "@/fetch/api";
import Link from "next/link";
import { ErrorState } from "@/components/ErrorState";
import { formatCurrency } from "@/utils/formatCurrency";

interface DashboardDTO {
  totalProducts: number;
  lowStock: number;
  inventoryValue: number;
  categories: number;
  outOfStock: number;
  byCategory: { category: string; totalProducts: number; lowStock: number; outOfStock: number; inventoryValue: number }[];
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardDTO | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    setData(null);
    apiRequest<DashboardDTO>("/dashboard", { signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : "Erro ao carregar dashboard.");
      });
    return () => controller.abort();
  }, [revision]);

  if (error) return <ErrorState message={error} onRetry={() => setRevision((value) => value + 1)} />;
  if (!data) return <p className="state-message">Carregando indicadores...</p>;

  return (
    <section>
      <span className="eyebrow">VISÃO GERAL</span>
      <h1>Dashboard</h1>
      <p className="section-intro">Indicadores atuais do catálogo GameHub.</p>
      <button className="button button--secondary" onClick={() => setRevision((value) => value + 1)}>Atualizar indicadores</button>
      <div className="metrics-grid">
        <MetricCard label="Produtos" value={String(data.totalProducts)} description="Itens cadastrados" />
        <MetricCard label="Estoque baixo" value={String(data.lowStock)} description="Cinco unidades ou menos" />
        <MetricCard label="Categorias" value={String(data.categories)} description="Categorias disponíveis" />
        <MetricCard label="Valor em estoque" value={data.inventoryValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} description="Preço × quantidade" />
      </div>
      <p>{data.outOfStock.toLocaleString("pt-BR")} produtos esgotados. <Link href="/products">Consultar catálogo</Link></p>
      <h2>Estoque por categoria</h2>
      <div className="table-scroll">
        <table className="dashboard-table">
          <caption>Distribuição do catálogo e alertas de estoque</caption>
          <thead><tr><th scope="col">Categoria</th><th scope="col">Produtos</th><th scope="col">Estoque baixo</th><th scope="col">Esgotados</th><th scope="col">Valor em estoque</th></tr></thead>
          <tbody>{data.byCategory.map((row) => <tr key={row.category}><th scope="row">{row.category}</th><td>{row.totalProducts.toLocaleString("pt-BR")}</td><td>{row.lowStock.toLocaleString("pt-BR")}</td><td>{row.outOfStock.toLocaleString("pt-BR")}</td><td>{formatCurrency(row.inventoryValue)}</td></tr>)}</tbody>
        </table>
      </div>
      {data.byCategory.length === 0 && <p>Nenhum produto cadastrado.</p>}
    </section>
  );
}
