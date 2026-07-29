import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname) } },
  test: { include: ["test/integration/**/*.spec.ts"], testTimeout: 30_000 },
})
