import assert from "node:assert/strict";
import { test } from "node:test";
import { db } from "../infra/database/db";
import { ProductRepository } from "../infra/repositories/ProductRepository";
import { productFiltersSchema } from "../src/dto/ProductFiltersDTO";
import { createProductSchema } from "../src/dto/CreateProductDTO";

test("listagem faz uma chamada limitada com parâmetros, total e desempate", async () => {
  const original = db.query;
  const calls: { sql: string; values: unknown[] }[] = [];
  db.query = (async (sql: string, values: unknown[]) => {
    calls.push({ sql, values });
    return { rows: [{ total: "3", items: [{ id: 1, name: "Game", description: "Game", category: "Jogos", price: "9.90", stock: 5 }] }] };
  }) as typeof db.query;
  try {
    const result = await new ProductRepository().findAll({ search: "100%_", category: "Jogos", sort: "price_desc", page: 2, pageSize: 2, stock: "low", minPrice: 9, maxPrice: 100 });
    assert.equal(calls.length, 1);
    assert.match(calls[0].sql, /price DESC, id DESC/);
    assert.match(calls[0].sql, /LIMIT \$5 OFFSET \$6/);
    assert.match(calls[0].sql, /stock <= 5/);
    assert.deepEqual(calls[0].values, ["%100\\%\\_%", "Jogos", 9, 100, 2, 2]);
    assert.equal(result.items[0].price, 9.9);
    assert.equal(result.totalPages, 2);
    assert.equal(result.total, 3);
  } finally { db.query = original; }
});

test("parâmetros inválidos não chegam ao banco", () => {
  for (const filters of [{ page: 0 }, { page: "1.5" }, { pageSize: 101 }, { pageSize: -1 }, { sort: "price; DROP TABLE products" }, { search: ["game"] }, { stock: "invalid" }, { minPrice: 100, maxPrice: 9 }, { minPrice: "NaN" }]) {
    assert.equal(productFiltersSchema.safeParse(filters).success, false);
  }
  assert.equal(productFiltersSchema.parse({}).pageSize, 24);
});

test("cadastro cobre categorias existentes e limites do PostgreSQL", () => {
  const input = { name: "Game", description: "Descrição", category: "Hardware", price: 9.9, stock: 0 };
  assert.equal(createProductSchema.safeParse(input).success, true);
  for (const override of [{ stock: 2147483648 }, { stock: -1 }, { price: 0 }, { price: 100000000 }, { price: 0.001 }]) {
    assert.equal(createProductSchema.safeParse({ ...input, ...override }).success, false);
  }
});

test("dashboard agrega em uma consulta e trata catálogo vazio", async () => {
  const original = db.query;
  let calls = 0;
  db.query = (async (sql: string) => {
    calls++;
    assert.match(sql, /GROUP BY category/);
    assert.match(sql, /FILTER \(WHERE stock <= 5\)/);
    return { rows: [] };
  }) as typeof db.query;
  try {
    assert.deepEqual(await new ProductRepository().getDashboard(), { totalProducts: 0, lowStock: 0, outOfStock: 0, inventoryValue: 0, categories: 0, byCategory: [] });
    assert.equal(calls, 1);
  } finally { db.query = original; }
});
