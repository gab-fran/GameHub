import Link from "next/link";

export function HomePage() {
  return (
    <section className="hero">
      <span className="eyebrow">CATÁLOGO • GESTÃO • INDICADORES</span>
      <h1>Sua coleção de games, organizada em um só lugar.</h1>
      <p>
        O GameHub é um sistema didático para gerenciar produtos de uma loja de games,
        acompanhar estoque e investigar o desempenho de uma aplicação full stack.
      </p>
      <div className="hero__actions">
        <Link href="/products" className="button">Explorar produtos</Link>
        <Link href="/login" className="button button--secondary">Acessar conta</Link>
      </div>
    </section>
  );
}
