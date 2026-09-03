# Person 2 — Local Vision & OCR

This module owns everything that turns pixels into structured visual and textual detections on-device.

## Overview

The Local Vision & OCR subsystem provides:
1. **Screenshot Collector**: Captures browser viewport with cross-browser WebExtension APIs (`chrome.tabs.captureVisibleTab`), handles device pixel ratio (DPR) coordinate scaling, and generates perceptual hashes for visual diffing.
2. **ONNX Runtime Web Integration**: Hardware-accelerated local inference (WebGPU with WASM/CPU fallback), letterboxed tensor preprocessing, and Non-Maximum Suppression (NMS) postprocessing.
3. **Local Vision Detector**: Real-time bounding box detection of UI elements (`BUTTON`, `INPUT`, `MODAL`, `IMAGE`, `ICON`) and sensitive visual entities (`FACE`, `SIGNATURE`, `DOCUMENT`, `ID_CARD`, `QR_CODE`).
4. **Tesseract.js OCR Engine**: Extracts on-screen text with word and line bounding boxes, confidence scoring, and high-performance Region-Of-Interest (ROI) OCR.
5. **Event-Driven Inference Controller**: Enforces perception efficiency (DECISIONS.md line 333) by executing inference only on explicit task start or debounced DOM mutations, and suppressing redundant computation when screens are visually unchanged.
6. **Shared Contract Mocks**: Ready-to-use fixtures and mock generators for Person 3 (Privacy Engine) and Person 6 (Testing).

---

## Directory Structure

```text
vision/
├── src/
│   ├── screenshot/
│   │   └── screenshot-collector.ts  # Capture, scaling, visual diff hashing
│   ├── onnx/
│   │   └── onnx-runtime-manager.ts  # WebGPU/WASM runtime, preprocessing & NMS
│   ├── models/
│   │   └── vision-detector.ts       # UI & sensitive entity detection
│   ├── ocr/
│   │   └── ocr-engine.ts            # Tesseract.js OCR & ROI recognition
│   ├── triggers/
│   │   └── inference-controller.ts  # Event-driven triggers & debouncing
│   ├── pipeline.ts                  # LocalVisionPipeline orchestrator
│   ├── mock.ts                      # Mock generators for P3 / P6
│   ├── types.ts                     # Internal vision module types
│   └── index.ts                     # Public API exports
├── test/
│   ├── screenshot.test.ts
│   ├── onnx-manager.test.ts
│   ├── vision-detector.test.ts
│   ├── ocr-engine.test.ts
│   ├── inference-controller.test.ts
│   ├── pipeline.test.ts
│   └── schema-validation.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## Interface & Contract Adherence

All outputs produced by Person 2 strictly adhere to `docs/DATA_SCHEMAS.md` and `docs/INTERFACES.md`:

```typescript
type VisionElement = {
  id: string;
  type: string;
  bbox: [number, number, number, number]; // [x, y, width, height] in CSS pixels
  confidence: number;
};

type OcrElement = {
  id: string;
  text: string;
  bbox: [number, number, number, number]; // [x, y, width, height] in CSS pixels
  confidence: number;
};
```

---

## Usage Guide

### 1. Basic Pipeline Execution

```typescript
import { LocalVisionPipeline } from "@browser-agent/vision";

const pipeline = new LocalVisionPipeline({
  visionConfig: { preferredProvider: "webgpu" },
  ocrConfig: { languages: "eng" },
});

// Warm up models
await pipeline.initialize();

// Process active tab or raw screenshot dataUrl
const result = await pipeline.processScreenshot(screenshotDataUrl);

console.log("Detected Vision Elements:", result.vision);
console.log("Detected OCR Elements:", result.ocr);
console.log("Inference Metrics:", result.metrics);
```

### 2. Event-Driven Triggers

```typescript
// On task start (immediate, high priority)
const taskResult = await pipeline.onTaskStart(screenshot);

// On DOM mutation (debounced by default 500ms)
const domResult = await pipeline.onDomMutation(screenshot);
```

### 3. For Person 3 (Privacy Engine) Development

Person 3 can immediately import mock data without waiting for runtime initialization:

```typescript
import { createMockPerceptionResult } from "@browser-agent/vision";

const mockPerception = createMockPerceptionResult(1920, 1080);
// mockPerception.vision -> VisionElement[]
// mockPerception.ocr    -> OcrElement[]
```

---

## Running Tests

```bash
cd vision
npm install
npm test
npm run typecheck
```
