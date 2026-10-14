import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { db } from "../infra/database/db";
import { ProductRepository } from "../infra/repositories/ProductRepository";

test("categoria filtra a coluna category", async () => {
  const original = db.query;
  const statements: string[] = [];
  db.query = (async (sql: string) => {
    statements.push(sql);
    return { rows: [], rowCount: 0 };
  }) as typeof db.query;
  try {
    await new ProductRepository().findAll({ category: "Jogos" });
    assert.match(statements[0], /category = \$1/);
  } finally {
    db.query = original;
  }
});

test("frontend preserva a ordenação numérica fornecida pelo banco", () => {
  const source = readFileSync("../front/src/views/ProductsPage.tsx", "utf8");
  assert.doesNotMatch(source, /String\(a\.price\)\.localeCompare/,
    "9,90, 100,00 e 1.200,00 devem ser ordenados numericamente");
});
