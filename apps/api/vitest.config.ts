import { existsSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Local convenience: pick up apps/api/.env; CI sets DATABASE_URL directly.
if (existsSync('.env')) process.loadEnvFile();

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    exclude: ['**/node_modules/**', 'dist/**'],
  },
});
