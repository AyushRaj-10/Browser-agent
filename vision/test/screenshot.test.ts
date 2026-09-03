import { describe, it, expect, beforeEach } from "vitest";
import { ScreenshotCollector } from "../src/screenshot/screenshot-collector";

describe("ScreenshotCollector", () => {
  let collector: ScreenshotCollector;

  beforeEach(() => {
    collector = new ScreenshotCollector();
  });

  it("normalizes a string dataUrl into CapturedScreenshot with metadata", async () => {
    const dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk";
    const result = await collector.normalizeInput(dataUrl, {
      width: 1920,
      height: 1080,
      devicePixelRatio: 2,
    });

    expect(result.dataUrl).toBe(dataUrl);
    expect(result.metadata.width).toBe(1920);
    expect(result.metadata.height).toBe(1080);
    expect(result.metadata.devicePixelRatio).toBe(2);
    expect(result.metadata.visualHash).toBeDefined();
    expect(typeof result.metadata.visualHash).toBe("string");
  });

  it("scales bounding box from pixel coords to viewport CSS coords with DPR", () => {
    // 2x Retina screen
    const pixelBox: [number, number, number, number] = [200, 100, 400, 300];
    const cssBox = collector.scaleBboxToViewport(pixelBox, 2);

    expect(cssBox).toEqual([100, 50, 200, 150]);
  });

  it("scales bounding box from CSS coords to physical pixel coords with DPR", () => {
    const cssBox: [number, number, number, number] = [100, 50, 200, 150];
    const pixelBox = collector.scaleBboxToPixels(cssBox, 2);

    expect(pixelBox).toEqual([200, 100, 400, 300]);
  });

  it("computes visual hash similarity and detects unchanged screens", () => {
    const hashA = "abcdef1234567890";
    const hashB = "abcdef1234567890";
    const hashC = "0000000000000000";

    expect(collector.compareVisualHashes(hashA, hashB)).toBe(1.0);
    expect(collector.compareVisualHashes(hashA, hashC)).toBeLessThan(0.5);

    // Test unchanged screen detection cache
    expect(collector.isVisuallyUnchanged(hashA)).toBe(false); // First time seen
    expect(collector.isVisuallyUnchanged(hashA)).toBe(true);  // Second time seen (identical)
  });
});
