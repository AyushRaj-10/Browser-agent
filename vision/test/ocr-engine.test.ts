import { describe, it, expect } from "vitest";
import { LocalOcrEngine } from "../src/ocr/ocr-engine";
import { createMockScreenshot } from "../src/mock";
import { isOcrElement } from "../../shared/schemas";

describe("LocalOcrEngine", () => {
  it("extracts OCR elements conforming to schema with fallback mode", async () => {
    const ocr = new LocalOcrEngine({
      confidenceThreshold: 0.6,
    });

    const screenshot = createMockScreenshot(1280, 720);
    const result = await ocr.recognize(screenshot);

    expect(result.elements.length).toBeGreaterThan(0);
    expect(result.fullText.length).toBeGreaterThan(0);
    expect(result.ocrTimeMs).toBeGreaterThanOrEqual(0);

    for (const element of result.elements) {
      expect(isOcrElement(element)).toBe(true);
      expect(element.confidence).toBeGreaterThanOrEqual(0.6);
      expect(element.bbox.length).toBe(4);
      expect(typeof element.text).toBe("string");
    }
  });
});
