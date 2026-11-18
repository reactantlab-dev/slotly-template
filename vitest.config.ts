import { defineConfig } from "vitest/config";

// API tests talk to a running Slotly server over HTTP (see scripts/grade.mjs).
export default defineConfig({
  test: {
    include: ["tests/api/**/*.test.ts"],
    testTimeout: 15_000,
    fileParallelism: false,
    reporters: ["default", "json"],
    outputFile: { json: ".grade-results/api.json" },
  },
});
