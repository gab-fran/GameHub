"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ProductCard } from "@/components/ProductCard";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import type { ProductDTO } from "@/dto/ProductDTO";
import { createProduct, deleteProduct, getProducts } from "@/fetch/productRequests";
import { measurePerformance } from "@/utils/measurePerformance";

export function ProductsPage() {
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("name");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [createMessage, setCreateMessage] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const token = window.localStorage.getItem("gamehub-token");
    if (!token) return;
    try {
      const encoded = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(window.atob(encoded));
      setIsAdmin(payload.role === "admin");
    } catch {
      setIsAdmin(false);
    }
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setCreating(true);
    setCreateMessage("");
    setError("");
    try {
      await createProduct({
        name: String(data.get("name") ?? "").trim(),
        description: String(data.get("description") ?? "").trim(),
        category: String(data.get("category") ?? "Jogos") as ProductDTO["category"],
        price: Number(data.get("price")),
        stock: Number(data.get("stock"))
      });
      setCreateMessage("Produto cadastrado. Catálogo atualizado.");
      form.reset();
      await loadProducts();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível cadastrar o produto.");
    } finally {
      setCreating(false);
    }
  }


  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await measurePerformance(
        "carregamento de produtos",
        () => getProducts({ search, category, sort })
      );
      setProducts(result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }, [search, category, sort]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  async function handleDelete(id: number) {
    if (!window.confirm("Deseja excluir este produto?")) return;

    try {
      await deleteProduct(id);
      await loadProducts();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível excluir.");
    }
  }

  const visibleProducts = products
    .filter((product) => {
      const term = search.toLowerCase();
      return (product.name.toLowerCase().includes(term) || product.description.toLowerCase().includes(term))
        && (!category || product.category === category);
    })
    .sort((a, b) => sort === "price"
      ? String(a.price).localeCompare(String(b.price))
      : a.name.localeCompare(b.name));

  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">CATÁLOGO</span>
          <h1>Produtos</h1>
          <p>Pesquise e consulte o estoque da loja.</p>
        </div>
        <span className="result-count">{visibleProducts.length} produtos • catálogo completo</span>
      </div>

      {isAdmin && (
        <form className="product-create-form" onSubmit={handleCreate}>
          <h2>Cadastrar produto</h2>
          <div className="product-create-form__grid">
            <label>Nome<input name="name" required minLength={2} maxLength={100} placeholder="Nome do produto" /></label>
            <label>Descrição<input name="description" required minLength={3} maxLength={500} placeholder="Descrição curta" /></label>
            <label>Categoria<select name="category" defaultValue="Jogos"><option value="Consoles">Consoles</option><option value="Jogos">Jogos</option><option value="Acessórios">Acessórios</option></select></label>
            <label>Preço<input name="price" type="number" min="0.01" step="0.01" required defaultValue="199.90" /></label>
            <label>Estoque<input name="stock" type="number" min="0" step="1" required defaultValue="10" /></label>
            <button className="button" disabled={creating}>{creating ? "Cadastrando..." : "Cadastrar produto"}</button>
          </div>
          {createMessage && <p className="form-success" role="status">{createMessage}</p>}
        </form>
      )}

      <div className="filters">
        <label>
          Buscar
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome do produto..." />
        </label>
        <label>
          Categoria
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">Todas</option>
            <option value="Consoles">Consoles</option>
            <option value="Jogos">Jogos</option>
            <option value="Acessórios">Acessórios</option>
          </select>
        </label>
        <label>
          Ordenar
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="name">Nome</option>
            <option value="price">Preço</option>
          </select>
        </label>
      </div>

      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={loadProducts} /> : (
        <div className="product-grid">
          {visibleProducts.map((product) => (
            <ProductCard key={product.id} product={product} onDelete={handleDelete} />
          ))}
          {visibleProducts.length === 0 && <p>Nenhum produto encontrado.</p>}
        </div>
      )}
    </section>
  );
}
