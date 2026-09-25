import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    projects: [
      {
        resolve: {
          alias: {
            "@": path.resolve(__dirname, "apps/web"),
            "@/supabase/functions": path.resolve(__dirname, "supabase/functions"),
          },
        },
        test: {
          name: "web",
          include: ["apps/web/{app,lib}/**/*.spec.ts", "packages/**/*.spec.ts"],
        },
      },
      "apps/api/vitest.config.ts",
    ],
  },
})
