import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    pool: "forks",
    teardownTimeout: 3000,
    hookTimeout: 10000,
  },
})
