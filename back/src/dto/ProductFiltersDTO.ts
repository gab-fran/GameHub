import { z } from "zod";

const price = z.coerce.number().finite().min(0).max(99999999.99).optional();
export const productFiltersSchema = z.object({
  search: z.string().trim().max(160).default(""),
  category: z.string().trim().max(80).default(""),
  sort: z.enum(["name", "price", "price_desc"]).default("name"),
  page: z.coerce.number().int().min(1).max(1000000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
  stock: z.enum(["all", "available", "low", "out"]).default("all"),
  minPrice: price,
  maxPrice: price
}).refine((value) => value.minPrice === undefined || value.maxPrice === undefined || value.minPrice <= value.maxPrice, {
  message: "O preço mínimo deve ser menor ou igual ao máximo.", path: ["minPrice"]
});

export type ProductFilters = z.input<typeof productFiltersSchema>;
