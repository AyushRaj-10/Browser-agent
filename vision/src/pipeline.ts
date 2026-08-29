import { VisionElement, OcrElement } from "../../shared/types";
import { ScreenshotCollector } from "./screenshot/screenshot-collector";
import { LocalVisionDetector } from "./models/vision-detector";
import { LocalOcrEngine } from "./ocr/ocr-engine";
import { InferenceTriggerController } from "./triggers/inference-controller";
import {
  ScreenshotInput,
  VisionModelConfig,
  OcrConfig,
  TriggerOptions,
  PerceptionPipelineResult,
  PerceptionMetrics,
  ExecutionProvider,
} from "./types";

export interface PipelineOptions {
  visionConfig?: VisionModelConfig;
  ocrConfig?: OcrConfig;
  triggerOptions?: TriggerOptions;
  enableRoiOcr?: boolean;
}

/**
 * LocalVisionPipeline is the unified perception orchestrator for Person 2.
 * It manages screenshot collection, visual detection, OCR extraction,
 * performance tracking, and event-driven triggers.
 */
export class LocalVisionPipeline {
  readonly screenshotCollector: ScreenshotCollector;
  readonly visionDetector: LocalVisionDetector;
  readonly ocrEngine: LocalOcrEngine;
  readonly triggerController: InferenceTriggerController;

  private lastCachedResult: PerceptionPipelineResult | null = null;
  private isInitialized = false;

  constructor(options?: PipelineOptions) {
    this.screenshotCollector = new ScreenshotCollector();
    this.visionDetector = new LocalVisionDetector(options?.visionConfig);
    this.ocrEngine = new LocalOcrEngine(options?.ocrConfig);
    this.triggerController = new InferenceTriggerController(options?.triggerOptions);
  }

  /**
   * Warms up the vision and OCR models in advance.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    await Promise.allSettled([
      this.visionDetector.initialize(),
      this.ocrEngine.initialize(),
    ]);
    this.isInitialized = true;
  }

  /**
   * Processes a screenshot input through the full vision + OCR perception stack.
   */
  async processScreenshot(
    input: ScreenshotInput,
    options?: {
      force?: boolean;
      signal?: AbortSignal;
      skipOcr?: boolean;
    }
  ): Promise<PerceptionPipelineResult> {
    const totalStart = Date.now();

    // 1. Capture & Normalize Screenshot
    const capStart = Date.now();
    const screenshot = await this.screenshotCollector.normalizeInput(input);
    const captureMs = Date.now() - capStart;

    if (options?.signal?.aborted) {
      throw new Error("Perception cancelled by AbortSignal");
    }

    // 2. Visual Diff Suppression (Skip if screen is unchanged and not forced)
    const isUnchanged =
      !options?.force &&
      screenshot.metadata.visualHash &&
      this.screenshotCollector.isVisuallyUnchanged(screenshot.metadata.visualHash);

    if (isUnchanged && this.lastCachedResult) {
      return {
        ...this.lastCachedResult,
        metrics: {
          ...this.lastCachedResult.metrics,
          skippedDueToSimilarity: true,
          totalMs: Date.now() - totalStart,
        },
      };
    }

    // 3. Run Vision Detection
    const visionResult = await this.visionDetector.detect(screenshot);

    if (options?.signal?.aborted) {
      throw new Error("Perception cancelled by AbortSignal");
    }

    // 4. Run OCR (with ROI optimization if document/card regions exist)
    let ocrElements: OcrElement[] = [];
    let ocrMs = 0;

    if (!options?.skipOcr) {
      const documentBoxes = visionResult.elements
        .filter((el) => el.type === "DOCUMENT" || el.type === "MODAL" || el.type === "ID_CARD")
        .map((el) => el.bbox);

      const ocrResult = await this.ocrEngine.recognize(
        screenshot,
        documentBoxes.length > 0 ? documentBoxes : undefined
      );
      ocrElements = ocrResult.elements;
      ocrMs = ocrResult.ocrTimeMs;
    }

    const totalMs = Date.now() - totalStart;

    const metrics: PerceptionMetrics = {
      captureMs,
      visionInferenceMs: visionResult.inferenceTimeMs,
      ocrMs,
      totalMs,
      providerUsed: visionResult.provider,
      skippedDueToSimilarity: false,
      elementCount: {
        vision: visionResult.elements.length,
        ocr: ocrElements.length,
      },
    };

    const result: PerceptionPipelineResult = {
      vision: visionResult.elements,
      ocr: ocrElements,
      metrics,
      screenshotMetadata: screenshot.metadata,
    };

    this.lastCachedResult = result;
    return result;
  }

  /**
   * Captures the active browser tab and processes it directly.
   */
  async runPerception(
    tabId?: number,
    options?: { force?: boolean; skipOcr?: boolean }
  ): Promise<PerceptionPipelineResult> {
    const screenshot = await this.screenshotCollector.captureTab(tabId);
    return await this.processScreenshot(screenshot, options);
  }

  /**
   * Runs perception triggered by Task Start (cancels previous pending runs).
   */
  async onTaskStart(
    input: ScreenshotInput,
    options?: { force?: boolean }
  ): Promise<PerceptionPipelineResult> {
    return this.triggerController.triggerTaskStart(async (signal) => {
      return this.processScreenshot(input, { ...options, signal, force: true });
    });
  }

  /**
   * Runs perception triggered by DOM Mutation (debounced).
   */
  async onDomMutation(
    input: ScreenshotInput,
    options?: { debounceMs?: number }
  ): Promise<PerceptionPipelineResult> {
    return this.triggerController.triggerDebounced(
      "DOM_MUTATION",
      async (signal) => {
        return this.processScreenshot(input, { signal });
      },
      options?.debounceMs
    );
  }

  /**
   * Releases resources (ONNX sessions, Tesseract workers, and timers).
   */
  async dispose(): Promise<void> {
    this.triggerController.cancel();
    await Promise.allSettled([
      this.visionDetector.dispose(),
      this.ocrEngine.terminate(),
    ]);
    this.lastCachedResult = null;
    this.isInitialized = false;
  }
}
