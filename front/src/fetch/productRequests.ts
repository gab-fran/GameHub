import type { ProductDTO } from "@/dto/ProductDTO";
import { apiRequest } from "@/fetch/api";

export interface ProductFilters {
  search?: string;
  category?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
  stock?: string;
  minPrice?: string;
  maxPrice?: string;
}

export interface ProductPage {
  items: ProductDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function getProducts(filters: ProductFilters = {}, signal?: AbortSignal) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return apiRequest<ProductPage>(`/products?${params.toString()}`, { signal });
}

export function createProduct(product: Omit<ProductDTO, "id">) {
  return apiRequest<ProductDTO>("/products", {
    method: "POST",
    body: JSON.stringify(product)
  });
}

export function deleteProduct(id: number) {
  return apiRequest<{ message: string }>(`/products/${id}`, {
    method: "DELETE"
  });
}
