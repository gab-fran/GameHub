import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  workers: 1,
  use: { baseURL: "http://localhost:3100", browserName: "chromium", ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) },
  webServer: {
    command: "npx next dev -p 3100",
    url: "http://localhost:3100",
    timeout: 120000,
    env: { GAMEHUB_NEXT_DIST_DIR: ".next-e2e" }
  }
});
