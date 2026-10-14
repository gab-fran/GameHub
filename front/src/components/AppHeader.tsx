"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/utils/useAuth";

export function AppHeader() {
  const router = useRouter();
  const { isAuthenticated, logout } = useAuth();

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <header className="app-header">
      <Link href="/" className="brand">GameHub</Link>
      <nav>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/products">Produtos</Link>
        {isAuthenticated ? (
          <button type="button" className="nav-logout" onClick={handleLogout}>Sair</button>
        ) : (
          <Link href="/login">Entrar</Link>
        )}
      </nav>
    </header>
  );
}
