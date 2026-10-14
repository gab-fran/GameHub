import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().min(3).max(500),
  category: z.enum(["Consoles", "Jogos", "Acessórios", "Periféricos", "Hardware"]),
  price: z.number().finite().positive().max(99999999.99).refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001, "Use até duas casas decimais."),
  stock: z.number().int().min(0).max(2147483647)
});

export type CreateProductDTO = z.infer<typeof createProductSchema>;
