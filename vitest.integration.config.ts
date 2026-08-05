import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "apps/web") } },
  test: {
    include: ["test/integration/**/*.spec.ts"],
    globalSetup: ["test/integration/setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
  },
})
