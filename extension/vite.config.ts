import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.config";

export default defineConfig(({ mode }) => {
  process.env.BROWSER_TARGET = mode === "firefox" ? "firefox" : "chrome";

  return {
    plugins: [react(), crx({ manifest })],
    build: {
      outDir: mode === "firefox" ? "dist/firefox" : "dist/chrome",
      emptyOutDir: true,
    },
  };
});
