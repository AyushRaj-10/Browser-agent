# extension/ — Extension Shell & DOM/UI

Manifest V3 browser extension scaffold with a background script, content
script with a structured DOM analyzer, and a React popup with a results
dashboard.

## Structure

```text
extension/
  manifest.config.ts        # MV3 manifest, Chrome vs Firefox variants
  vite.config.ts
  src/
    background/index.ts     # message router, sanitize-then-send orchestration
    content/
      index.ts              # listens for ANALYZE_PAGE requests
      domAnalyzer.ts        # reads interactive elements and DOM metadata
    popup/
      App.tsx               # task input + analysis results dashboard
      main.tsx
      index.html
    shared/messages.ts      # shared extension message/data contract
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

This watches and rebuilds into `dist/chrome`.

Load it as an unpacked extension:

1. Open `chrome://extensions`
2. Enable Developer mode
3. Select "Load unpacked"
4. Select `extension/dist/chrome`

## Dev (Firefox)

```bash
npm run dev:firefox
```

This watches and rebuilds into `dist/firefox`.

Load it temporarily through:

1. Open `about:debugging#/runtime/this-firefox`
2. Select "Load Temporary Add-on"
3. Select `extension/dist/firefox/manifest.json`

Firefox MV3 background scripts differ from Chrome's service-worker model.

`vite.config.ts` determines the browser target from the Vite mode and calls
`createManifest(isFirefox)`.

`manifest.config.ts` then generates:

- `background.service_worker` for Chrome
- `background.scripts` for Firefox

## Production Build

```bash
npm run build             # Chrome -> dist/chrome
npm run build:firefox     # Firefox -> dist/firefox
npm run typecheck         # TypeScript validation
```

## Integration Contract

The extension exposes structured DOM information through the shared
`PageAnalysis` interface defined in `src/shared/messages.ts`.

### Request

The background script can request analysis from the content script with:

```ts
{
  type: "ANALYZE_PAGE"
}
```

The content script responds with:

```ts
{
  type: "ANALYZE_PAGE_RESULT",
  analysis: PageAnalysis
}
```

### PageAnalysis

Each analysis contains:

- Page URL and title
- Analysis timestamp
- Interactive DOM elements
- Labels and input types
- Element states
- Bounding boxes
- Temporary privacy metadata

Each detected interactive element is represented by `AnalyzedField` in
`src/shared/messages.ts`.

### Bounding Boxes

`bbox` values are viewport-relative CSS pixel coordinates obtained from
`getBoundingClientRect()`.

The structure is:

```ts
{
  x: number;
  y: number;
  width: number;
  height: number;
}
```

This coordinate convention must be taken into account when aligning DOM
elements with screenshots or vision-model detections.

### Privacy

The `sensitive` field currently uses lightweight extension-side heuristics
from `src/content/domAnalyzer.ts`.

These heuristics exist so the extension can be tested and demonstrated
independently. They are not intended to replace the dedicated privacy
component.

During full integration, the privacy component should be treated as the
authoritative source for PII classification and redaction.

The extension maintains the following invariant:

> Fields classified as sensitive by the extension never expose their raw
> value through `sampleValue`.

### Element IDs

When an element already has a DOM `id`, that identifier is used.

If an element does not have one, the analyzer generates an identifier such
as:

```text
agent-element-7
```

Generated identifiers are useful for identifying elements within an
analysis result, but they should not be treated as persistent selectors
across page reloads or DOM changes.

### Roles

The `role` property currently represents explicitly declared DOM roles.

It does not perform complete browser accessibility-role inference.

## Integration Notes for the Team

- `BACKEND_URL` in `src/background/index.ts` is currently a placeholder:
  `http://localhost:8787/api/agent/task`.

  Update it when the backend integration endpoint is finalized and align
  the request/response structure with `src/shared/messages.ts`.

- The extension currently performs lightweight sensitivity checks using
  `SENSITIVE_INPUT_TYPES` and `SENSITIVE_NAME_PATTERNS` in
  `src/content/domAnalyzer.ts`.

  The dedicated privacy component may extend or replace this classification
  during integration.

- `PageAnalysis` is the primary structured DOM output produced by this
  module.

- Bounding boxes are viewport-relative and should use the same coordinate
  convention when combining DOM information with vision/OCR output.

- Generated `agent-element-*` IDs are analysis identifiers, not guaranteed
  stable execution selectors.

- Icons in `public/icons/` are placeholders and can be replaced when final
  project branding is available.