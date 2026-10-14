import assert from "node:assert/strict";
import { test } from "node:test";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { app } from "../src/app";
import { db } from "../infra/database/db";
import { environment } from "../infra/config/environment";

test("API e PostgreSQL: catálogo, dashboard e permissões", async (suite) => {
  suite.after(() => db.end());
  const client = await db.connect();
  const original = db.query;
  const server = app.listen(0);
  try {
    await client.query("BEGIN");
    // Temporary tables isolate fixtures from the user's catalog and sequences.
    await client.query(`CREATE TEMP TABLE products (
      id SERIAL PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL,
      category TEXT NOT NULL, price NUMERIC(10,2) NOT NULL, stock INTEGER NOT NULL
    ) ON COMMIT DROP;
    CREATE TEMP TABLE users (id SERIAL PRIMARY KEY, name TEXT, email TEXT, password_hash TEXT, role TEXT) ON COMMIT DROP;
    INSERT INTO products (name, description, category, price, stock) VALUES
      ('AAA', 'Aventura espacial', 'Jogos', 9.90, 0),
      ('BBB', 'Corrida', 'Jogos', 100, 5),
      ('CCC', 'Placa gamer', 'Hardware', 1200, 6),
      ('DDD', 'Estratégia', 'Jogos', 100, 10),
      ('100%_Game', 'Console', 'Consoles', 50, 3),
      ('EEE', 'Mouse', 'Hardware', 9.90, 1)`);
    await client.query("INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4)", ["Admin", "test@gamehub.local", await bcrypt.hash("123456", 4), "admin"]);
    db.query = client.query.bind(client) as typeof db.query;
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const base = `http://127.0.0.1:${address.port}/api`;
    const admin = jwt.sign({ id: 1, role: "admin" }, environment.jwtSecret);
    const student = jwt.sign({ id: 2, role: "student" }, environment.jwtSecret);
    const request = (path: string, token?: string, options: RequestInit = {}) => fetch(base + path, { ...options, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
    const catalog = async (query: string) => {
      const response = await request(`/products?${query}`);
      assert.equal(response.status, 200);
      return response.json();
    };

    await suite.test("categoria e preço numérico crescente/decrescente", async () => {
      const data = await catalog("category=Jogos&sort=price");
      assert.equal(data.total, 3);
      assert.deepEqual(data.items.map((row: { price: number }) => row.price), [9.9, 100, 100]);
      const desc = await catalog("sort=price_desc");
      assert.deepEqual(desc.items.map((row: { price: number }) => row.price), [1200, 100, 100, 50, 9.9, 9.9]);
    });
    await suite.test("paginação sem repetição, total e página vazia", async () => {
      const first = await catalog("sort=price&pageSize=2");
      const second = await catalog("sort=price&pageSize=2&page=2");
      assert.equal(first.totalPages, 3);
      assert.equal(first.items.length, 2);
      assert.equal(new Set([...first.items, ...second.items].map((row) => row.id)).size, 4);
      const empty = await catalog("page=99&pageSize=2");
      assert.equal(empty.total, 6);
      assert.deepEqual(empty.items, []);
    });
    await suite.test("busca por descrição, sem diferenciar maiúsculas e com caracteres literais", async () => {
      assert.equal((await catalog("search=ESPACIAL")).items[0].name, "AAA");
      assert.equal((await catalog("search=" + encodeURIComponent("100%_"))).total, 1);
      assert.equal((await catalog("search=" + encodeURIComponent("' OR 1=1 --"))).total, 0);
    });
    await suite.test("filtros combinados de preço e estoque", async () => {
      assert.equal((await catalog("stock=low")).total, 4);
      assert.equal((await catalog("stock=out")).total, 1);
      assert.equal((await catalog("stock=available")).total, 5);
      const data = await catalog("category=Jogos&stock=available&minPrice=50&maxPrice=100");
      assert.equal(data.total, 2);
    });
    await suite.test("parâmetros inválidos retornam 400", async () => {
      for (const query of ["page=0", "pageSize=101", "sort=invalid", "minPrice=100&maxPrice=9", "category[a]=Jogos", "search=a&search=b"]) {
        assert.equal((await request(`/products?${query}`)).status, 400);
      }
    });
    await suite.test("dashboard consistente com as categorias e protegido", async () => {
      assert.equal((await request("/dashboard")).status, 401);
      const response = await request("/dashboard", student);
      assert.equal(response.status, 200);
      const dashboard = await response.json();
      assert.equal(dashboard.totalProducts, 6);
      assert.equal(dashboard.lowStock, 4);
      assert.equal(dashboard.outOfStock, 1);
      assert.equal(dashboard.categories, 3);
      assert.equal(dashboard.inventoryValue, 8859.9);
      assert.equal(dashboard.byCategory.reduce((sum: number, row: { totalProducts: number }) => sum + row.totalProducts, 0), 6);
    });
    await suite.test("login, criação e exclusão preservam permissões", async () => {
      const login = await request("/auth/login", undefined, { method: "POST", body: JSON.stringify({ email: "test@gamehub.local", password: "123456" }) });
      assert.equal(login.status, 200);
      assert.ok((await login.json()).token);
      const options = { method: "POST", body: JSON.stringify({ name: "Novo", description: "Produto novo", category: "Periféricos", price: 19.9, stock: 2 }) };
      assert.equal((await request("/products", undefined, options)).status, 401);
      assert.equal((await request("/products", student, options)).status, 403);
      const response = await request("/products", admin, options);
      assert.equal(response.status, 201);
      const created = await response.json();
      assert.equal((await catalog("category=" + encodeURIComponent("Periféricos"))).total, 1);
      assert.equal((await request(`/products/${created.id}`, student, { method: "DELETE" })).status, 403);
      assert.equal((await request(`/products/${created.id}`, admin, { method: "DELETE" })).status, 200);
      assert.equal((await request(`/products/${created.id}`, admin, { method: "DELETE" })).status, 404);
      assert.equal((await request("/products/invalid", admin, { method: "DELETE" })).status, 400);
      assert.equal((await catalog("category=" + encodeURIComponent("Periféricos"))).total, 0);
    });
    await suite.test("falhas assíncronas chegam ao middleware de erros", async () => {
      const query = db.query;
      db.query = (async () => { throw new Error("Falha simulada no banco"); }) as typeof db.query;
      try {
        const response = await request("/products");
        assert.equal(response.status, 500);
        assert.deepEqual(await response.json(), { message: "Ocorreu um erro interno." });
      } finally { db.query = query; }
    });
    await suite.test("catálogo e dashboard vazios", async () => {
      await client.query("DELETE FROM products");
      const empty = await catalog("pageSize=24");
      assert.equal(empty.total, 0);
      assert.equal(empty.totalPages, 0);
      assert.deepEqual(empty.items, []);
      const response = await request("/dashboard", admin);
      assert.deepEqual(await response.json(), { totalProducts: 0, lowStock: 0, outOfStock: 0, inventoryValue: 0, categories: 0, byCategory: [] });
    });
  } finally {
    db.query = original;
    await client.query("ROLLBACK");
    client.release();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
