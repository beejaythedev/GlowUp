import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Makes DATABASE_URL (from .env) available to tests that talk to the
  // local dev database, e.g. src/server/bookings.test.ts (M2-3).
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));

  return {
    plugins: [react()],
    resolve: {
      tsconfigPaths: true,
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./vitest.setup.ts"],
      exclude: ["node_modules", ".next", "e2e"],
    },
  };
});
