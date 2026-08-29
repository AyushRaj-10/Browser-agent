import {
  BoundingBox,
  VisionElement,
  OcrElement,
} from "../../shared/types";

export type ExecutionProvider = "webgpu" | "wasm" | "cpu" | "heuristic" | "mock";

export interface ScreenshotMetadata {
  width: number;
  height: number;
  devicePixelRatio: number;
  timestamp: number;
  visualHash?: string;
}

export interface CapturedScreenshot {
  dataUrl: string;
  metadata: ScreenshotMetadata;
  rawImage?: HTMLImageElement | ImageBitmap | OffscreenCanvas | ImageData;
}

export type ScreenshotInput = string | CapturedScreenshot | ImageData;

export interface NormalizedCropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VisionModelConfig {
  modelPath?: string;
  modelType?: "yolo" | "ultraface" | "element-detector" | "heuristic" | "mock";
  inputShape?: [number, number, number, number]; // [B, C, H, W] e.g. [1, 3, 640, 640]
  confidenceThreshold?: number;
  iouThreshold?: number;
  preferredProvider?: "webgpu" | "wasm" | "cpu";
  labels?: string[];
}

export interface OcrConfig {
  languages?: string; // e.g. 'eng'
  workerPath?: string;
  corePath?: string;
  langPath?: string;
  confidenceThreshold?: number;
  enableRoiOcr?: boolean;
}

export interface PerceptionMetrics {
  captureMs: number;
  visionInferenceMs: number;
  ocrMs: number;
  totalMs: number;
  providerUsed: ExecutionProvider;
  skippedDueToSimilarity?: boolean;
  elementCount: {
    vision: number;
    ocr: number;
  };
}

export interface PerceptionPipelineResult {
  vision: VisionElement[];
  ocr: OcrElement[];
  metrics: PerceptionMetrics;
  screenshotMetadata: ScreenshotMetadata;
}

export interface TriggerOptions {
  debounceMs?: number;
  minSimilarityThresholdToSkip?: number; // e.g. 0.98
  enableVisualDiffCheck?: boolean;
  abortSignal?: AbortSignal;
}

export type TriggerEventType =
  | "TASK_START"
  | "DOM_MUTATION"
  | "NAVIGATION"
  | "SCROLL"
  | "MANUAL";
