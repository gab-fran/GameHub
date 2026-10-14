import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "./db";

async function migrate() {
  const sql = await readFile(path.join(__dirname, "indexes.sql"), "utf8");
  await db.query(sql);
  console.info("Índices e estatísticas do catálogo atualizados.");
}

migrate().catch((error) => {
  console.error("Falha ao atualizar índices:", error);
  process.exitCode = 1;
}).finally(() => db.end());
