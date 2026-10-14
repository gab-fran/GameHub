import { expect, test, type Page } from "@playwright/test";

const fixtures = Array.from({ length: 25 }, (_, index) => ({
  id: index + 1, name: `Produto ${String(index + 1).padStart(2, "0")}`,
  description: "Produto gamer", category: index % 2 ? "Jogos" : "Hardware",
  price: [9.9, 100, 1200][index % 3], stock: index % 7
}));

async function mockCatalog(page: Page) {
  let products = [...fixtures];
  const requests: URL[] = [];
  await page.route("**/api/products**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "DELETE") {
      products = products.filter((row) => row.id !== Number(url.pathname.split("/").at(-1)));
      await route.fulfill({ json: { message: "Excluído" } });
      return;
    }
    if (request.method() === "POST") {
      const product = { ...request.postDataJSON(), id: 99 };
      products.push(product);
      await route.fulfill({ status: 201, json: product });
      return;
    }
    requests.push(url);
    const params = url.searchParams;
    let items = products.filter((row) => (!params.get("category") || row.category === params.get("category")) && (!params.get("search") || row.name.includes(params.get("search")!))
      && (!params.get("minPrice") || row.price >= Number(params.get("minPrice")))
      && (!params.get("maxPrice") || row.price <= Number(params.get("maxPrice")))
      && (params.get("stock") !== "out" || row.stock === 0));
    items = items.sort((a, b) => params.get("sort") === "price" ? a.price - b.price || a.id - b.id : params.get("sort") === "price_desc" ? b.price - a.price || b.id - a.id : a.name.localeCompare(b.name));
    const current = Number(params.get("page") || 1);
    const size = Number(params.get("pageSize") || 24);
    await route.fulfill({ json: { items: items.slice((current - 1) * size, current * size), total: items.length, page: current, pageSize: size, totalPages: Math.ceil(items.length / size) } });
  });
  return requests;
}

test("catálogo limitado, categoria, preço numérico e paginação", async ({ page }) => {
  const requests = await mockCatalog(page);
  await page.goto("/products");
  await expect(page.locator(".product-card")).toHaveCount(24);
  await expect(page.getByRole("button", { name: "Excluir", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Próxima" }).click();
  await expect(page.locator(".product-card")).toHaveCount(1);
  await expect(page.getByText("Página 2 de 2")).toBeVisible();
  await page.getByRole("combobox", { name: "Categoria", exact: true }).selectOption("Hardware");
  await expect(page.locator(".product-card")).toHaveCount(13);
  expect(requests.at(-1)?.searchParams.get("page")).toBe("1");
  await page.getByRole("combobox", { name: "Ordenar", exact: true }).selectOption("price");
  await expect(page.locator(".product-card").first().locator("strong")).toHaveText(/9,90/);
  await page.getByRole("combobox", { name: "Ordenar", exact: true }).selectOption("price_desc");
  await expect(page.locator(".product-card").first().locator("strong")).toHaveText(/1\.200,00/);
  expect(requests.every((url) => Number(url.searchParams.get("pageSize")) <= 100)).toBe(true);
});

test("busca espera a digitação e limpar filtros restaura o catálogo", async ({ page }) => {
  const requests = await mockCatalog(page);
  await page.goto("/products");
  await expect(page.locator(".product-card")).toHaveCount(24);
  const before = requests.length;
  await page.getByLabel("Buscar", { exact: true }).pressSequentially("Produto 25", { delay: 25 });
  await expect(page.locator(".product-card")).toHaveCount(1);
  expect(requests.length - before).toBe(1);
  expect(requests.at(-1)?.searchParams.get("search")).toBe("Produto 25");
  await page.getByRole("button", { name: "Limpar filtros" }).click();
  await expect(page.locator(".product-card")).toHaveCount(24);
});

test("admin cadastra e excluir o último item volta para a página anterior", async ({ page }) => {
  await page.addInitScript(() => {
    const payload = btoa(JSON.stringify({ role: "admin", exp: Math.floor(Date.now() / 1000) + 3600 }));
    localStorage.setItem("gamehub-token", `test.${payload}.test`);
  });
  const requests = await mockCatalog(page);
  await page.goto("/products");
  await expect(page.locator(".product-card")).toHaveCount(24);
  await page.getByRole("button", { name: "Próxima" }).click();
  await expect(page.locator(".product-card")).toHaveCount(1);
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Excluir", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(24);
  await expect(page.getByText("Página 1 de 1")).toBeVisible();
  const form = page.locator(".product-create-form");
  await form.getByLabel("Nome", { exact: true }).fill("Novo produto");
  await form.getByLabel("Descrição", { exact: true }).fill("Descrição nova");
  await form.getByRole("combobox", { name: "Categoria", exact: true }).selectOption("Periféricos");
  await form.getByRole("button", { name: "Cadastrar produto", exact: true }).click();
  await expect(page.getByText("Produto cadastrado. Catálogo atualizado com os filtros selecionados.")).toBeVisible();
  await expect(page.getByText("25 produtos encontrados")).toBeVisible();
  expect(requests.every((url) => url.searchParams.get("pageSize") === "24")).toBe(true);
});

test("dashboard apresenta resumo por categoria e permite atualizar", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/dashboard", async (route) => {
    calls++;
    await route.fulfill({ json: { totalProducts: 25, lowStock: 3, outOfStock: 1, inventoryValue: 1000, categories: 1,
      byCategory: [{ category: "Jogos", totalProducts: 25, lowStock: 3, outOfStock: 1, inventoryValue: 1000 }] } });
  });
  await page.goto("/dashboard");
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("rowheader", { name: "Jogos" })).toBeVisible();
  const before = calls;
  await page.getByRole("button", { name: "Atualizar indicadores" }).click();
  await expect.poll(() => calls).toBe(before + 1);
  await expect(page.getByRole("table")).toBeVisible();
});

test("resposta atrasada da busca anterior não substitui a atual", async ({ page }) => {
  let started = false;
  let finished = false;
  await page.route("**/api/products**", async (route) => {
    const term = new URL(route.request().url()).searchParams.get("search");
    if (term === "lento") {
      started = true;
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
    const items = [{ ...fixtures[0], name: term === "novo" ? "Resultado novo" : term === "lento" ? "Resultado antigo" : "Inicial" }];
    try {
      await route.fulfill({ json: { items, total: 1, page: 1, pageSize: 24, totalPages: 1 } });
    } catch { /* Browser may have aborted the old request. */ }
    finally { if (term === "lento") finished = true; }
  });
  await page.goto("/products");
  await expect(page.getByRole("heading", { name: "Inicial", exact: true })).toBeVisible();
  await page.getByLabel("Buscar", { exact: true }).fill("lento");
  await expect.poll(() => started).toBe(true);
  await page.getByLabel("Buscar", { exact: true }).fill("novo");
  await expect(page.getByRole("heading", { name: "Resultado novo", exact: true })).toBeVisible();
  await expect.poll(() => finished).toBe(true);
  await expect(page.getByRole("heading", { name: "Resultado novo", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Resultado antigo", exact: true })).toHaveCount(0);
});

test("faixa de preço inválida é explicada e pode ser corrigida", async ({ page }) => {
  const requests = await mockCatalog(page);
  await page.goto("/products");
  await expect(page.locator(".product-card")).toHaveCount(24);
  await page.getByLabel("Preço mínimo (R$)", { exact: true }).fill("1000");
  await expect(page.locator(".product-card")).toHaveCount(8);
  const before = requests.length;
  await page.getByLabel("Preço máximo (R$)", { exact: true }).fill("100");
  await expect(page.getByText("O preço mínimo deve ser menor ou igual ao máximo.")).toBeVisible();
  expect(requests.length).toBe(before);
  await page.getByLabel("Preço máximo (R$)", { exact: true }).fill("2000");
  await expect(page.locator(".product-card")).toHaveCount(8);
  expect(requests.at(-1)?.searchParams.get("maxPrice")).toBe("2000");
});
