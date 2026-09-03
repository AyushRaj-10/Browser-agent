// Canonical Types and Schemas (re-exported for convenience)
export * from "../../shared/types";
export * from "../../shared/constants";
export * from "../../shared/schemas";

// Internal Person 2 Types
export * from "./types";

// Pipeline and Subsystems
export { LocalVisionPipeline, PipelineOptions } from "./pipeline";
export { ScreenshotCollector } from "./screenshot/screenshot-collector";
export { LocalVisionDetector, DetectionResult } from "./models/vision-detector";
export { LocalOcrEngine, OcrResult } from "./ocr/ocr-engine";
export { OnnxRuntimeManager, RawBoxPrediction, PreprocessedTensorResult } from "./onnx/onnx-runtime-manager";
export { InferenceTriggerController, InferenceCallback } from "./triggers/inference-controller";

// Mocks & Test Fixtures
export * from "./mock";
