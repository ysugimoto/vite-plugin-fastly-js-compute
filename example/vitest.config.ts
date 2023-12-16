import { defineConfig } from "vitest/config";
import fastlyCompute from "vite-plugin-fastly-compute-js";

export default defineConfig({
  plugins: [fastlyCompute()],
  test: {
    include: ["src/**/*.test.ts"],
    globals: true,
  },
});
