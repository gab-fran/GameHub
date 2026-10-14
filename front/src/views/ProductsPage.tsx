"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ProductCard } from "@/components/ProductCard";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { createProduct, deleteProduct, getProducts, type ProductPage } from "@/fetch/productRequests";
import { measurePerformance } from "@/utils/measurePerformance";

const categories = ["Consoles", "Jogos", "Acessórios", "Periféricos", "Hardware"];
const initialFilters = { search: "", category: "", sort: "name", stock: "all", minPrice: "", maxPrice: "", page: 1, pageSize: 24 };

export function ProductsPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState<ProductPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [createMessage, setCreateMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const token = window.localStorage.getItem("gamehub-token");
    if (!token) return;
    try {
      const encoded = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(window.atob(encoded));
      setIsAdmin(payload.role === "admin" && payload.exp * 1000 > Date.now());
    } catch { setIsAdmin(false); }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      if (filters.minPrice !== "" && filters.maxPrice !== "" && Number(filters.minPrice) > Number(filters.maxPrice)) {
        setError("O preço mínimo deve ser menor ou igual ao máximo.");
        setLoading(false);
        return;
      }
      let repaging = false;
      try {
        const result = await measurePerformance("carregamento de produtos", () => getProducts(filters, controller.signal));
        if (controller.signal.aborted) return;
        if (result.page > Math.max(1, result.totalPages)) {
          repaging = true;
          setFilters((current) => ({ ...current, page: Math.max(1, result.totalPages) }));
          return;
        }
        setData(result);
      } catch (requestError) {
        if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : "Erro inesperado.");
      } finally { if (!controller.signal.aborted && !repaging) setLoading(false); }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [filters, revision]);

  function changeFilter(key: keyof typeof initialFilters, value: string | number) {
    setLoading(true);
    setFilters((current) => ({ ...current, [key]: value, page: 1 }));
  }

  function refresh() {
    setLoading(true);
    setRevision((current) => current + 1);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = new FormData(form);
    setCreating(true);
    setCreateMessage("");
    setError("");
    try {
      await createProduct({
        name: String(input.get("name") ?? "").trim(),
        description: String(input.get("description") ?? "").trim(),
        category: String(input.get("category") ?? "Jogos"),
        price: Number(input.get("price")), stock: Number(input.get("stock"))
      });
      setCreateMessage("Produto cadastrado. Catálogo atualizado com os filtros selecionados.");
      form.reset();
      refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível cadastrar o produto.");
    } finally { setCreating(false); }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Deseja excluir este produto?")) return;
    setDeletingId(id);
    try {
      await deleteProduct(id);
      refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível excluir.");
    } finally { setDeletingId(null); }
  }

  return (
    <section>
      <div className="page-heading">
        <div><span className="eyebrow">CATÁLOGO</span><h1>Produtos</h1><p>Pesquise e consulte o estoque da loja.</p></div>
        <span className="result-count" role="status">{loading ? "Consultando..." : `${data?.total.toLocaleString("pt-BR") ?? 0} produtos encontrados`}</span>
      </div>
      {isAdmin && (
        <form className="product-create-form" onSubmit={handleCreate}>
          <h2>Cadastrar produto</h2>
          <div className="product-create-form__grid">
            <label>Nome<input name="name" required minLength={2} maxLength={100} placeholder="Nome do produto" /></label>
            <label>Descrição<input name="description" required minLength={3} maxLength={500} placeholder="Descrição curta" /></label>
            <label>Categoria<select name="category" defaultValue="Jogos">{categories.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Preço<input name="price" type="number" min="0.01" max="99999999.99" step="0.01" required defaultValue="199.90" /></label>
            <label>Estoque<input name="stock" type="number" min="0" max="2147483647" step="1" required defaultValue="10" /></label>
            <button className="button" disabled={creating}>{creating ? "Cadastrando..." : "Cadastrar produto"}</button>
          </div>
          {createMessage && <p className="form-success" role="status">{createMessage}</p>}
        </form>
      )}
      <div className="filters">
        <label>Buscar<input value={filters.search} maxLength={160} onChange={(event) => changeFilter("search", event.target.value)} placeholder="Nome ou descrição..." /></label>
        <label>Categoria<select value={filters.category} onChange={(event) => changeFilter("category", event.target.value)}><option value="">Todas</option>{categories.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>Ordenar<select value={filters.sort} onChange={(event) => changeFilter("sort", event.target.value)}><option value="name">Nome</option><option value="price">Menor preço</option><option value="price_desc">Maior preço</option></select></label>
        <label>Estoque<select value={filters.stock} onChange={(event) => changeFilter("stock", event.target.value)}><option value="all">Todos</option><option value="available">Disponível</option><option value="low">Baixo (até 5)</option><option value="out">Esgotado</option></select></label>
        <label>Preço mínimo (R$)<input type="number" min="0" max="99999999.99" step="0.01" value={filters.minPrice} onChange={(event) => changeFilter("minPrice", event.target.value)} /></label>
        <label>Preço máximo (R$)<input type="number" min="0" max="99999999.99" step="0.01" value={filters.maxPrice} onChange={(event) => changeFilter("maxPrice", event.target.value)} /></label>
        <label>Produtos por página<select value={filters.pageSize} onChange={(event) => changeFilter("pageSize", Number(event.target.value))}><option value={24}>24</option><option value={48}>48</option><option value={96}>96</option></select></label>
        <button className="button button--secondary" onClick={() => { setLoading(true); setFilters({ ...initialFilters }); }}>Limpar filtros</button>
      </div>
      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={refresh} /> : (
        <>
          <div className="product-grid">
            {data?.items.map((product) => <ProductCard key={product.id} product={product} onDelete={isAdmin ? handleDelete : undefined} deleting={deletingId !== null} />)}
            {data?.items.length === 0 && <p>Nenhum produto encontrado.</p>}
          </div>
          <nav className="pagination" aria-label="Paginação dos produtos">
            <button className="button button--secondary" disabled={filters.page <= 1} onClick={() => { setLoading(true); setFilters((current) => ({ ...current, page: current.page - 1 })); }}>Anterior</button>
            <span role="status">Página {data?.page ?? 1} de {Math.max(1, data?.totalPages ?? 0)}</span>
            <button className="button button--secondary" disabled={filters.page >= (data?.totalPages ?? 0)} onClick={() => { setLoading(true); setFilters((current) => ({ ...current, page: current.page + 1 })); }}>Próxima</button>
          </nav>
        </>
      )}
    </section>
  );
}
