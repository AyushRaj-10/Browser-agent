import { describe, it, expect } from "vitest";
import { LocalVisionPipeline } from "../src/pipeline";
import { createMockScreenshot } from "../src/mock";
import { isVisionElement, isOcrElement } from "../../shared/schemas";

describe("LocalVisionPipeline", () => {
  it("processes a screenshot through vision and OCR producing canonical detections", async () => {
    const pipeline = new LocalVisionPipeline({
      visionConfig: { modelType: "heuristic" },
      ocrConfig: { confidenceThreshold: 0.5 },
    });

    const screenshot = createMockScreenshot(1280, 720);
    const result = await pipeline.processScreenshot(screenshot, { force: true });

    expect(result.vision).toBeDefined();
    expect(result.ocr).toBeDefined();
    expect(result.metrics).toBeDefined();
    expect(result.metrics.totalMs).toBeGreaterThanOrEqual(0);
    expect(result.metrics.elementCount.vision).toBe(result.vision.length);
    expect(result.metrics.elementCount.ocr).toBe(result.ocr.length);

    // Verify all output elements strictly conform to canonical contracts
    for (const v of result.vision) {
      expect(isVisionElement(v)).toBe(true);
    }
    for (const o of result.ocr) {
      expect(isOcrElement(o)).toBe(true);
    }
  });

  it("skips heavy re-computation on identical screenshots due to visual hash diffing", async () => {
    const pipeline = new LocalVisionPipeline();
    const screenshot = createMockScreenshot(1280, 720);

    const firstRun = await pipeline.processScreenshot(screenshot);
    expect(firstRun.metrics.skippedDueToSimilarity).toBe(false);

    // Second run with identical screenshot without force
    const secondRun = await pipeline.processScreenshot(screenshot, { force: false });
    expect(secondRun.metrics.skippedDueToSimilarity).toBe(true);
  });
});
