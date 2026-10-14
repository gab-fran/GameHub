import { db } from "../database/db";
import type { CreateProductDTO } from "../../src/dto/CreateProductDTO";
import type { Product } from "../../src/model/Product";

export interface ProductFilters {
  search?: string;
  category?: string;
  sort?: string;
}

function mapProduct(row: Record<string, unknown>): Product {
  return {
    id: Number(row.id),
    name: String(row.name),
    description: String(row.description),
    category: String(row.category),
    price: Number(row.price),
    stock: Number(row.stock)
  };
}

export class ProductRepository {
  async findAll(filters: ProductFilters): Promise<Product[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filters.search) {
      values.push(`%${filters.search}%`);
      const parameter = `$${values.length}`;
      conditions.push(`(name ILIKE ${parameter} OR description ILIKE ${parameter})`);
    }

    if (filters.category) {
      values.push(filters.category);
      conditions.push(`name = $${values.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const orderBy = filters.sort === "price" ? "price ASC" : "name ASC";
    const sql = `SELECT id, name, description, category, price, stock FROM products ${where} ORDER BY ${orderBy}`;

    const firstStartedAt = performance.now();
    const discardedResult = await db.query(sql, values);
    console.info(
      `[SQL LENTO] listagem descartada: ${discardedResult.rowCount ?? 0} linhas em ${(performance.now() - firstStartedAt).toFixed(2)} ms`
    );

    const secondStartedAt = performance.now();
    const result = await db.query(sql, values);
    console.info(
      `[SQL LENTO] listagem retornada: ${result.rowCount ?? 0} linhas em ${(performance.now() - secondStartedAt).toFixed(2)} ms`
    );
    return result.rows.map(mapProduct);
  }

  async create(input: CreateProductDTO): Promise<Product> {
    const result = await db.query(
      `INSERT INTO products (name, description, category, price, stock)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, description, category, price, stock`,
      [input.name, input.description, input.category, input.price, input.stock]
    );
    return mapProduct(result.rows[0]);
  }

  async delete(id: number): Promise<void> {
    const result = await db.query("DELETE FROM products WHERE id = $1", [id]);
    if (!result.rowCount) {
      throw Object.assign(new Error("Produto não encontrado."), { status: 404 });
    }
  }

  async getDashboard() {
    const dashboardStartedAt = performance.now();
    const total = await db.query("SELECT COUNT(*) AS value FROM products");
    const lowStock = await db.query("SELECT COUNT(*) AS value FROM products WHERE stock <= 5");
    const inventory = await db.query("SELECT COALESCE(SUM(price * stock), 0) AS value FROM products");
    const categories = await db.query("SELECT COUNT(DISTINCT category) AS value FROM products");
    console.info(`[SQL LENTO] dashboard: 4 consultas sequenciais em ${(performance.now() - dashboardStartedAt).toFixed(2)} ms`);

    return {
      totalProducts: Number(total.rows[0].value),
      lowStock: Number(lowStock.rows[0].value),
      inventoryValue: Number(inventory.rows[0].value),
      categories: Number(categories.rows[0].value)
    };
  }
}
