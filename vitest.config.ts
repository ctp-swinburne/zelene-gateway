// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    exclude: ["node_modules"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./test/coverage",
      exclude: ["**/node_modules/**", "test/**"],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    reporters: ["default", "html"],
    outputFile: {
      html: "./test/reports/test-results.html",
    },
    includeTaskLocation: true,
  },
});
