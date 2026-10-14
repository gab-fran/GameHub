CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_products_name ON products (name, id);
CREATE INDEX IF NOT EXISTS idx_products_price ON products (price, id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category, name, id);
CREATE INDEX IF NOT EXISTS idx_products_category_price ON products (category, price, id);
CREATE INDEX IF NOT EXISTS idx_products_name_search ON products USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_description_search ON products USING GIN (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_low_stock ON products (stock) WHERE stock <= 5;

ANALYZE products;
