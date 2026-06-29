import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "apps/web/src"),
    },
  },
  test: {
    globals: true,
    include: ["packages/**/src/**/*.test.ts", "apps/web/src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["packages/**/src/**/*.ts", "apps/web/src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/index.ts"],
    },
  },
});
