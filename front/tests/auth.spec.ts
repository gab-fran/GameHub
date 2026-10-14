import { expect, test } from "@playwright/test";

test("login mostra Sair e logout remove a sessão mesmo após recarregar", async ({ page }) => {
  await page.route("**/api/auth/login", (route) => route.fulfill({
    json: { token: "demo-token", user: { id: 1, name: "Aluno", email: "aluno@gamehub.local", role: "student" } }
  }));
  await page.route("**/api/dashboard", (route) => route.fulfill({
    json: { totalProducts: 0, lowStock: 0, outOfStock: 0, inventoryValue: 0, categories: 0, byCategory: [] }
  }));

  await page.goto("/login");
  const header = page.locator("header");
  await expect(header.getByRole("link", { name: "Entrar" })).toBeVisible();
  await expect(header.getByRole("button", { name: "Sair" })).toHaveCount(0);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(header.getByRole("button", { name: "Sair" })).toBeVisible();
  await expect(header.getByRole("link", { name: "Entrar" })).toHaveCount(0);

  await page.reload();
  await expect(header.getByRole("button", { name: "Sair" })).toBeVisible();
  await header.getByRole("link", { name: "GameHub" }).click();
  await expect(page).toHaveURL("/");
  await header.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => localStorage.getItem("gamehub-token"))).toBeNull();
  await expect(header.getByRole("link", { name: "Entrar" })).toBeVisible();
  await page.reload();
  await expect(header.getByRole("button", { name: "Sair" })).toHaveCount(0);
});
