import path from "node:path";
import { defineConfig } from "vitest/config";

// API tests talk to a running Slotly server over HTTP (see scripts/grade.mjs).
// The grader passes GRADE_RESULTS_DIR, a temporary directory outside the project, for the JSON results.
const resultsDir = process.env.GRADE_RESULTS_DIR;
export default defineConfig({
  test: {
    include: ["tests/api/**/*.test.ts"],
    testTimeout: 15_000,
    fileParallelism: false,
    reporters: resultsDir ? ["default", "json"] : ["default"],
    ...(resultsDir ? { outputFile: { json: path.join(resultsDir, "api.json") } } : {}),
  },
});
