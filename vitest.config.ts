/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import fastlyCompute from "./dist/index";

export default defineConfig({
  plugins: [fastlyCompute()],
  test: {
    globals: true,
    include: ["**/tests/*.test.ts"],
    exclude: ["example", "node_modules"],
  },
});
