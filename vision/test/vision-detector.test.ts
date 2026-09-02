import { describe, it, expect } from "vitest";
import { LocalVisionDetector } from "../src/models/vision-detector";
import { createMockScreenshot } from "../src/mock";
import { isVisionElement } from "../../shared/schemas";

describe("LocalVisionDetector", () => {
  it("detects visual UI elements with heuristic detector fallback", async () => {
    const detector = new LocalVisionDetector({
      modelType: "heuristic",
      confidenceThreshold: 0.5,
    });

    const screenshot = createMockScreenshot(1280, 800);
    const result = await detector.detect(screenshot);

    expect(result.elements.length).toBeGreaterThan(0);
    expect(result.provider).toBe("heuristic");
    expect(result.inferenceTimeMs).toBeGreaterThanOrEqual(0);

    for (const element of result.elements) {
      expect(isVisionElement(element)).toBe(true);
      expect(element.bbox.length).toBe(4);
      expect(element.confidence).toBeGreaterThanOrEqual(0.5);
    }
  });

  it("returns mock detections when modelType is mock", async () => {
    const detector = new LocalVisionDetector({
      modelType: "mock",
    });

    const screenshot = createMockScreenshot(1000, 600);
    const result = await detector.detect(screenshot);

    expect(result.provider).toBe("mock");
    expect(result.elements.length).toBe(3);
    expect(result.elements.some((e) => e.type === "FACE")).toBe(true);
    expect(result.elements.some((e) => e.type === "DOCUMENT")).toBe(true);
    expect(result.elements.some((e) => e.type === "BUTTON")).toBe(true);
  });
});
