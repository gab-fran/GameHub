CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'student'))
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(80) NOT NULL,
  price NUMERIC(10, 2) NOT NULL CHECK (price > 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO products (
    name,
    description,
    category,
    price,
    stock,
    created_at
)
SELECT
    'Produto Gamer ' || numero,
    'Descrição detalhada do produto gamer número ' || numero,
    CASE numero % 5
        WHEN 0 THEN 'Consoles'
        WHEN 1 THEN 'Periféricos'
        WHEN 2 THEN 'Acessórios'
        WHEN 3 THEN 'Jogos'
        ELSE 'Hardware'
    END,
    ROUND((50 + random() * 1950)::numeric, 2),
    (1 + floor(random() * 100))::integer,
    NOW() - (random() * INTERVAL '365 days')
FROM generate_series(1, 5000) AS numero
WHERE NOT EXISTS (SELECT 1 FROM products);


INSERT INTO products (
    name,
    description,
    category,
    price,
    stock,
    created_at
)
SELECT seed.* FROM (VALUES
    (
        'AAA - Produto de R$ 9,90',
        'Produto de teste para verificar a ordenação por preço.',
        'Acessórios',
        9.90,
        50,
        NOW()
    ),
    (
        'BBB - Produto de R$ 100,00',
        'Produto de teste para verificar a ordenação por preço.',
        'Periféricos',
        100.00,
        50,
        NOW()
    ),
    (
        'CCC - Produto de R$ 1.200,00',
        'Produto de teste para verificar a ordenação por preço.',
        'Hardware',
        1200.00,
        50,
        NOW()
    )) AS seed(name, description, category, price, stock, created_at)
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = seed.name);
