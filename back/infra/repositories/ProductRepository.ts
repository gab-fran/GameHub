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
    const result = await db.query(`SELECT category, COUNT(*) AS total,
      COUNT(*) FILTER (WHERE stock <= 5) AS low_stock,
      COUNT(*) FILTER (WHERE stock = 0) AS out_of_stock,
      COALESCE(SUM(price * stock), 0) AS inventory_value
      FROM products GROUP BY category ORDER BY category`);
    const byCategory = result.rows.map((row) => ({
      category: String(row.category), totalProducts: Number(row.total),
      lowStock: Number(row.low_stock), outOfStock: Number(row.out_of_stock),
      inventoryValue: Number(row.inventory_value)
    }));
    return {
      totalProducts: byCategory.reduce((sum, row) => sum + row.totalProducts, 0),
      lowStock: byCategory.reduce((sum, row) => sum + row.lowStock, 0),
      outOfStock: byCategory.reduce((sum, row) => sum + row.outOfStock, 0),
      inventoryValue: byCategory.reduce((sum, row) => sum + row.inventoryValue, 0),
      categories: byCategory.length, byCategory
    };
  }
}
