import bcrypt from "bcryptjs";
import { db } from "./db";
import path from "node:path";

const schemaPath = path.join(__dirname, "init.sql");
const TARGET_PRODUCT_COUNT = 60000;

const demoProducts = [
  ["Console Nova X", "Console de nova geração com armazenamento rápido.", "Consoles", 3499.9, 8],
  ["Console Pocket", "Console portátil para jogar em qualquer lugar.", "Consoles", 1899.9, 4],
  ["Aventura das Estrelas", "Jogo de aventura e exploração espacial.", "Jogos", 249.9, 15],
  ["Corrida Turbo", "Corridas arcade com pistas variadas.", "Jogos", 199.9, 3],
  ["Controle sem fio", "Controle ergonômico com conexão sem fio.", "Acessórios", 329.9, 12],
  ["Headset Gamer", "Headset com microfone e som estéreo.", "Acessórios", 279.9, 5],
  ["Teclado Mecânico", "Teclado compacto com iluminação.", "Acessórios", 399.9, 7],
  ["RPG Reinos Antigos", "RPG com campanha longa e mundo aberto.", "Jogos", 299.9, 9]
] as const;

const productTemplates = [
  { name: "Console Nova", description: "Console de jogos com armazenamento de alta velocidade.", category: "Consoles", basePrice: 2299 },
  { name: "Console Portátil", description: "Console portátil para partidas em qualquer lugar.", category: "Consoles", basePrice: 1499 },
  { name: "Controle Gamer", description: "Controle ergonômico com resposta rápida e conexão estável.", category: "Acessórios", basePrice: 249 },
  { name: "Headset Surround", description: "Headset gamer com microfone e áudio imersivo.", category: "Acessórios", basePrice: 319 },
  { name: "Teclado Mecânico", description: "Teclado mecânico compacto com iluminação configurável.", category: "Acessórios", basePrice: 399 },
  { name: "Mouse de Precisão", description: "Mouse gamer com sensor de alta precisão.", category: "Acessórios", basePrice: 189 },
  { name: "Aventura Galáctica", description: "Jogo de aventura em um universo de exploração espacial.", category: "Jogos", basePrice: 249 },
  { name: "Corrida Extrema", description: "Jogo de corrida com pistas e veículos variados.", category: "Jogos", basePrice: 199 },
  { name: "RPG Reinos", description: "RPG com campanha extensa e mundo aberto.", category: "Jogos", basePrice: 289 },
  { name: "Jogo de Estratégia", description: "Jogo de estratégia com desafios táticos.", category: "Jogos", basePrice: 179 }
] as const;

async function seedProducts() {
  const countResult = await db.query<{ total: string }>("SELECT COUNT(*) AS total FROM products");
  let currentCount = Number(countResult.rows[0].total);

  if (currentCount === 0) {
    for (const product of demoProducts) {
      await db.query(
        `INSERT INTO products (name, description, category, price, stock)
         VALUES ($1, $2, $3, $4, $5)`,
        [...product]
      );
    }
    currentCount = demoProducts.length;
  }

  let sequence = currentCount + 1;
  while (currentCount < TARGET_PRODUCT_COUNT) {
    const batch: unknown[] = [];
    const rows: string[] = [];
    const batchSize = Math.min(500, TARGET_PRODUCT_COUNT - currentCount);

    for (let index = 0; index < batchSize; index += 1) {
      const template = productTemplates[(sequence - 1) % productTemplates.length];
      const number = String(sequence).padStart(5, "0");
      const offset = sequence % 37;
      const start = batch.length + 1;
      rows.push(`($${start}, $${start + 1}, $${start + 2}, $${start + 3}, $${start + 4})`);
      batch.push(
        `${template.name} ${number}`,
        `${template.description} Código de catálogo ${number}.`,
        template.category,
        template.basePrice + offset * 3.75,
        (sequence * 7) % 24
      );
      sequence += 1;
    }

    await db.query(
      `INSERT INTO products (name, description, category, price, stock) VALUES ${rows.join(", ")}`,
      batch
    );
    currentCount += batchSize;
  }
}

async function initialize() {
  const fs = await import("node:fs/promises");
  const schema = await fs.readFile(schemaPath, "utf8");
  await db.query(schema);

  const passwordHash = await bcrypt.hash("123456", 10);
  await db.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)
     ON CONFLICT (email) DO NOTHING`,
    [
      "Administrador GameHub", "admin@gamehub.local", passwordHash, "admin",
      "Aluno GameHub", "aluno@gamehub.local", passwordHash, "student"
    ]
  );

  await seedProducts();
  const indexes = await fs.readFile(path.join(__dirname, "indexes.sql"), "utf8");
  await db.query(indexes);
  console.info(`Banco PostgreSQL inicializado: gamehub (${TARGET_PRODUCT_COUNT} produtos-alvo)`);
}

initialize()
  .catch((error) => {
    console.error("Falha ao inicializar o banco:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.end();
  });
