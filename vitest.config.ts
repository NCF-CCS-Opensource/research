import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "apps/web"),
      "@/supabase/functions": path.resolve(__dirname, "supabase/functions"),
    },
  },
  test: {
    include: ["apps/web/lib/**/*.spec.ts", "packages/**/*.spec.ts"],
  },
})
