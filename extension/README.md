# extension/ — Extension Shell & DOM/UI

Manifest V3 browser extension scaffold: background service worker, content
script with a DOM analyzer, and a React popup with a results dashboard.

## Structure

```
extension/
  manifest.config.ts   # MV3 manifest, chrome vs firefox variants
  vite.config.ts
  src/
    background/index.ts   # message router, sanitize-then-send orchestration
    content/
      index.ts             # listens for ANALYZE_PAGE requests
      domAnalyzer.ts        # reads form fields/labels/types, flags sensitive ones
    popup/
      App.tsx               # task input + "Ask AI" + results dashboard
      main.tsx
      index.html
    shared/messages.ts       # message contract (reconcile with backend team)
```

## Setup

```bash
cd extension
npm install
```

## Dev (Chrome)

```bash
npm run dev
```

This watches and rebuilds into `dist/chrome`. Load it as an unpacked
extension:

1. `chrome://extensions`
2. Enable Developer mode
3. "Load unpacked" → select `extension/dist/chrome`

## Dev (Firefox)

```bash
npm run dev:firefox
```

Builds into `dist/firefox`. Load it via:

1. `about:debugging#/runtime/this-firefox`
2. "Load Temporary Add-on" → select any file inside `extension/dist/firefox`

Firefox MV3 background scripts differ from Chrome's service worker model —
`manifest.config.ts` switches between `background.service_worker` (Chrome)
and `background.scripts` (Firefox) based on the `BROWSER_TARGET` env var,
which `vite.config.ts` sets from the `--mode` flag.

## Production build

```bash
npm run build           # Chrome -> dist/chrome
npm run build:firefox   # Firefox -> dist/firefox
```

## Integration notes for the team

- `BACKEND_URL` in `src/background/index.ts` is a placeholder
  (`http://localhost:8787/api/agent/task`). Update it once the `backend`
  branch exposes its real endpoint, and align the request/response shape
  with `src/shared/messages.ts`.
- The DOM analyzer's sensitivity heuristics live in
  `src/content/domAnalyzer.ts` (`SENSITIVE_INPUT_TYPES`,
  `SENSITIVE_NAME_PATTERNS`). Whoever owns PII detection/redaction can
  extend or replace this — the contract it must keep is: sensitive fields
  never carry a raw value past the content script.
- Icons in `public/icons/` are placeholders — swap them for the real ones
  whenever design/branding is finalized.
