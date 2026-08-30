import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import { createManifest } from "./manifest.config";

export default defineConfig(({ mode }) => {
  const isFirefox = mode === "firefox";

  return {
    plugins: [
      react(),
      crx({
        manifest: createManifest(isFirefox),
      }),
    ],

    build: {
      outDir: isFirefox
        ? "dist/firefox"
        : "dist/chrome",

      emptyOutDir: true,
    },
  };
});