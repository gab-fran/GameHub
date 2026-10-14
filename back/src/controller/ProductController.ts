import type { Request, Response } from "express";
import { createProductSchema } from "../dto/CreateProductDTO";
import { ProductService } from "../../infra/services/ProductService";
import { productFiltersSchema } from "../dto/ProductFiltersDTO";

export class ProductController {
  constructor(private readonly service = new ProductService()) {}

  list = async (request: Request, response: Response) => {
    const parsed = productFiltersSchema.safeParse(request.query);
    if (!parsed.success) {
      response.status(400).json({ message: "Filtros inválidos.", errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const products = await this.service.list(parsed.data);
    response.json(products);
  };

  create = async (request: Request, response: Response) => {
    const parsed = createProductSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        message: "Dados inválidos.",
        errors: parsed.error.flatten().fieldErrors
      });
      return;
    }

    const product = await this.service.create(parsed.data);
    response.status(201).json(product);
  };

  remove = async (request: Request, response: Response) => {
    await this.service.remove(Number(request.params.id));
    response.json({ message: "Produto excluído com sucesso." });
  };

  dashboard = async (_request: Request, response: Response) => {
    response.json(await this.service.dashboard());
  };
}
