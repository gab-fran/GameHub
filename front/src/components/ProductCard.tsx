import type { ProductDTO } from "@/dto/ProductDTO";
import { formatCurrency } from "@/utils/formatCurrency";

interface ProductCardProps {
  product: ProductDTO;
  onDelete?: (id: number) => void;
  deleting?: boolean;
}

export function ProductCard({ product, onDelete, deleting }: ProductCardProps) {
  return (
    <article className="product-card">
      <div className="product-card__top">
        <span className="category-pill">{product.category}</span>
        <span className={product.stock <= 5 ? "stock stock--low" : "stock"}>
          Estoque: {product.stock}
        </span>
      </div>
      <h2>{product.name}</h2>
      <p>{product.description}</p>
      <div className="product-card__bottom">
        <strong>{formatCurrency(product.price)}</strong>
        {onDelete && (
          <button className="button button--danger" disabled={deleting} onClick={() => onDelete(product.id)}>
            Excluir
          </button>
        )}
      </div>
    </article>
  );
}
