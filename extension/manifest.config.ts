import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json";

export function createManifest(isFirefox: boolean) {
  return defineManifest({
    manifest_version: 3,

    name: "Browser Agent — Privacy-Preserving Vision Agent",

    description:
      "On-device visual perception with local PII redaction before any data leaves the browser.",

    version: pkg.version,

    icons: {
      16: "public/icons/icon16.png",
      48: "public/icons/icon48.png",
      128: "public/icons/icon128.png",
    },

    action: {
      default_popup: "src/popup/index.html",

      default_icon: {
        16: "public/icons/icon16.png",
        48: "public/icons/icon48.png",
        128: "public/icons/icon128.png",
      },
    },

    background: isFirefox
      ? {
          scripts: ["src/background/index.ts"],
          type: "module",
        }
      : {
          service_worker: "src/background/index.ts",
          type: "module",
        },

    content_scripts: [
      {
        matches: ["<all_urls>"],
        js: ["src/content/index.ts"],
        run_at: "document_idle",
      },
    ],

    permissions: ["activeTab", "scripting", "storage", "tabs"],

    host_permissions: ["<all_urls>"],

    ...(isFirefox && {
      browser_specific_settings: {
        gecko: {
          id: "browser-agent@sih2026.local",
          strict_min_version: "115.0",
        },
      },
    }),
  });
}