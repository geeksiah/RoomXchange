import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"]
  },
  resolve: {
    alias: {
      axios: path.resolve(__dirname, "packages/shared/node_modules/axios/index.js"),
      "@roomxchange/contracts": path.resolve(__dirname, "packages/contracts/src/index.ts"),
      "@roomxchange/shared": path.resolve(__dirname, "packages/shared/src/index.ts")
    }
  }
});
