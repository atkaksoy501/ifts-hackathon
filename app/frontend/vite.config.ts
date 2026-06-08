import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true
      }
    }
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["src/app/test-setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "coverage",
      include: ["src/features/**/*.{ts,tsx}", "src/shared/**/*.{ts,tsx}"],
      exclude: ["**/*.test.{ts,tsx}"],
      thresholds: {
        statements: 75,
        branches: 75,
        functions: 65,
        lines: 75
      }
    }
  }
});
