import { defineConfig, globalIgnores } from "eslint/config"
import baseConfig from "@repo/eslint-config"

export default defineConfig([
  ...baseConfig,
  globalIgnores(["dist/**", "drizzle/**", "node_modules/**"]),
  {
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  {
    files: ["**/domain/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@nestjs/common",
              message: "Domain layer must not import NestJS.",
            },
            {
              name: "@nestjs/core",
              message: "Domain layer must not import NestJS.",
            },
            {
              name: "drizzle-orm",
              message: "Domain layer must not import Drizzle.",
            },
            {
              name: "zod",
              message: "Domain layer must not import Zod.",
            },
          ],
          patterns: [
            {
              group: ["@nestjs/*"],
              message: "Domain layer must not import NestJS.",
            },
            {
              group: ["drizzle-orm/*"],
              message: "Domain layer must not import Drizzle.",
            },
            {
              group: ["zod/*"],
              message: "Domain layer must not import Zod.",
            },
          ],
        },
      ],
    },
  },
])
