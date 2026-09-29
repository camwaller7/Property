import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Unit tests target the pure business-logic modules in src/lib (tenancy rules,
// jurisdictions, GST/finance maths, formatting). No DOM is needed, so we run in
// the default node environment. The "@/" alias mirrors tsconfig.json.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.{test,spec}.ts"],
    environment: "node",
  },
});
