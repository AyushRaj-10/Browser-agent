import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import { createManifest } from "./manifest.config";
import fs from "fs";
import path from "path";

function cleanFirefoxManifest() {
  return {
    name: "clean-firefox-manifest",
    closeBundle() {
      const manifestPath = path.resolve(process.cwd(), "dist/firefox/manifest.json");
      if (fs.existsSync(manifestPath)) {
        try {
          const content = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
          if (Array.isArray(content.web_accessible_resources)) {
            for (const item of content.web_accessible_resources) {
              delete item.use_dynamic_url;
            }
            fs.writeFileSync(manifestPath, JSON.stringify(content, null, 2), "utf-8");
          }
        } catch {}
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const isFirefox = mode === "firefox";

  return {
    plugins: [
      react(),
      crx({
        manifest: createManifest(isFirefox),
      }),
      ...(isFirefox ? [cleanFirefoxManifest()] : []),
    ],

    build: {
      outDir: isFirefox
        ? "dist/firefox"
        : "dist/chrome",

      emptyOutDir: true,
    },
  };
});