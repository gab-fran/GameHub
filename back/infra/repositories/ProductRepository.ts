import { db } from "../database/db";
import type { CreateProductDTO } from "../../src/dto/CreateProductDTO";
import type { Product } from "../../src/model/Product";
import { productFiltersSchema, type ProductFilters } from "../../src/dto/ProductFiltersDTO";
export type { ProductFilters } from "../../src/dto/ProductFiltersDTO";

export interface ProductPage {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
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
  async findAll(input: ProductFilters): Promise<ProductPage> {
    const filters = productFiltersSchema.parse(input);
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filters.search) {
      values.push(`%${filters.search.replace(/[\\%_]/g, "\\$&")}%`);
      const parameter = `$${values.length}`;
      conditions.push(`(name ILIKE ${parameter} OR description ILIKE ${parameter})`);
    }

    if (filters.category) {
      values.push(filters.category);
      conditions.push(`category = $${values.length}`);
    }

    if (filters.stock === "available") conditions.push("stock > 0");
    if (filters.stock === "low") conditions.push("stock <= 5");
    if (filters.stock === "out") conditions.push("stock = 0");
    if (filters.minPrice !== undefined) {
      values.push(filters.minPrice);
      conditions.push(`price >= $${values.length}`);
    }
    if (filters.maxPrice !== undefined) {
      values.push(filters.maxPrice);
      conditions.push(`price <= $${values.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const orderBy = filters.sort === "price" ? "price ASC, id ASC"
      : filters.sort === "price_desc" ? "price DESC, id DESC" : "name ASC, id ASC";
    values.push(filters.pageSize, (filters.page - 1) * filters.pageSize);
    // Count and bounded page share one snapshot; only the page reaches Node/browser.
    const result = await db.query<{ total: string; items: Record<string, unknown>[] }>(`
      WITH page AS (
        SELECT id, name, description, category, price, stock FROM products ${where}
        ORDER BY ${orderBy} LIMIT $${values.length - 1} OFFSET $${values.length}
      )
      SELECT (SELECT COUNT(*) FROM products ${where}) AS total,
        COALESCE((SELECT json_agg(page ORDER BY ${orderBy}) FROM page), '[]'::json) AS items`, values);
    const total = Number(result.rows[0]?.total ?? 0);
    return {
      items: (result.rows[0]?.items ?? []).map(mapProduct),
      total, page: filters.page, pageSize: filters.pageSize,
      totalPages: Math.ceil(total / filters.pageSize)
    };
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
