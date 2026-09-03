import { describe, it, expect } from "vitest";
import {
  isVisionElement,
  isOcrElement,
  isBoundingBox,
  isPerceptionResult,
} from "../../shared/schemas";
import {
  createMockVisionElements,
  createMockOcrElements,
  createMockPerceptionResult,
} from "../src/mock";

describe("Person 2 Mock Fixtures & Schema Validation", () => {
  it("validates mock vision elements", () => {
    const vision = createMockVisionElements(1920, 1080);
    expect(vision.length).toBeGreaterThan(0);
    for (const el of vision) {
      expect(isVisionElement(el)).toBe(true);
      expect(isBoundingBox(el.bbox)).toBe(true);
    }
  });

  it("validates mock ocr elements", () => {
    const ocr = createMockOcrElements(1920, 1080);
    expect(ocr.length).toBeGreaterThan(0);
    for (const el of ocr) {
      expect(isOcrElement(el)).toBe(true);
      expect(isBoundingBox(el.bbox)).toBe(true);
    }
  });

  it("validates complete mock perception output against PerceptionResult contract", () => {
    const perception = createMockPerceptionResult(1920, 1080);
    const fullPerception = {
      pageUrl: "https://example.com/profile",
      timestamp: Date.now(),
      dom: [],
      vision: perception.vision,
      ocr: perception.ocr,
    };

    expect(isPerceptionResult(fullPerception)).toBe(true);
  });
});
