import { performance } from "node:perf_hooks";
import { db } from "../infra/database/db";
import { ProductRepository } from "../infra/repositories/ProductRepository";

async function measure(action: () => Promise<unknown>) {
  await action();
  const samples: number[] = [];
  let result: unknown;
  for (let index = 0; index < 5; index++) {
    const start = performance.now();
    result = await action();
    samples.push(performance.now() - start);
  }
  return { medianMs: Number(samples.sort((a, b) => a - b)[2].toFixed(2)), payloadBytes: Buffer.byteLength(JSON.stringify(result)), result };
}

async function main() {
  const repository = new ProductRepository();
  const oldCatalog = await measure(async () => {
    const sql = "SELECT id, name, description, category, price, stock FROM products ORDER BY name ASC";
    await db.query(sql);
    const result = await db.query(sql);
    return result.rows.map((row) => ({ ...row, price: Number(row.price) }));
  });
  const catalog = await measure(() => repository.findAll({}));
  const oldDashboard = await measure(async () => {
    const total = await db.query("SELECT COUNT(*) AS value FROM products");
    const low = await db.query("SELECT COUNT(*) AS value FROM products WHERE stock <= 5");
    const inventory = await db.query("SELECT COALESCE(SUM(price * stock),0) AS value FROM products");
    const categories = await db.query("SELECT COUNT(DISTINCT category) AS value FROM products");
    return { totalProducts: Number(total.rows[0].value), lowStock: Number(low.rows[0].value), inventoryValue: Number(inventory.rows[0].value), categories: Number(categories.rows[0].value) };
  });
  const dashboard = await measure(() => repository.getDashboard());
  const plan = await db.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    SELECT id, name, description, category, price, stock FROM products
    WHERE category = $1 ORDER BY price ASC, id ASC LIMIT 24`, ["Jogos"]);
  const searchPlan = await db.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    SELECT id FROM products WHERE name ILIKE $1 OR description ILIKE $1`, ["%00042%"]);
  const page = catalog.result as Awaited<ReturnType<ProductRepository["findAll"]>>;
  console.info(JSON.stringify({
    products: page.total, samples: 5, method: "mediana após aquecimento; ambos os fluxos com os índices atuais",
    catalog: { before: { medianMs: oldCatalog.medianMs, payloadBytes: oldCatalog.payloadBytes, queries: 2 }, after: { medianMs: catalog.medianMs, payloadBytes: catalog.payloadBytes, queries: 1, renderedCards: page.items.length } },
    dashboard: { beforeMs: oldDashboard.medianMs, afterMs: dashboard.medianMs, queriesBefore: 4, queriesAfter: 1 },
    categoryPricePlan: plan.rows[0]["QUERY PLAN"], searchPlan: searchPlan.rows[0]["QUERY PLAN"]
  }, null, 2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.end());
