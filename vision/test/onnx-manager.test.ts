import { describe, it, expect } from "vitest";
import { OnnxRuntimeManager } from "../src/onnx/onnx-runtime-manager";
import { BoundingBox } from "../../shared/types";

describe("OnnxRuntimeManager", () => {
  const manager = new OnnxRuntimeManager();

  it("computes Intersection over Union (IoU) accurately", () => {
    const boxA: BoundingBox = [0, 0, 100, 100]; // Area = 10000
    const boxB: BoundingBox = [50, 0, 100, 100]; // Overlap = 50 * 100 = 5000, Union = 15000
    const iou = manager.computeIoU(boxA, boxB);
    expect(iou).toBeCloseTo(5000 / 15000, 2);

    // Non-overlapping boxes
    const boxC: BoundingBox = [200, 200, 50, 50];
    expect(manager.computeIoU(boxA, boxC)).toBe(0);

    // Completely identical boxes
    expect(manager.computeIoU(boxA, boxA)).toBe(1.0);
  });

  it("applies Non-Maximum Suppression (NMS) to remove redundant boxes", () => {
    const predictions = [
      {
        bbox: [100, 100, 50, 50] as BoundingBox,
        confidence: 0.95,
        classId: 0,
        label: "BUTTON",
      },
      {
        // Highly overlapping box with lower confidence
        bbox: [102, 101, 48, 49] as BoundingBox,
        confidence: 0.82,
        classId: 0,
        label: "BUTTON",
      },
      {
        // Distinct non-overlapping box
        bbox: [300, 300, 60, 60] as BoundingBox,
        confidence: 0.91,
        classId: 1,
        label: "FACE",
      },
    ];

    const result = manager.applyNMS(predictions, 0.45);
    expect(result.length).toBe(2);
    expect(result[0].confidence).toBe(0.95);
    expect(result[1].label).toBe("FACE");
  });

  it("preprocesses image buffer into letterboxed NCHW tensor", () => {
    const srcW = 800;
    const srcH = 600;
    const pixels = new Uint8ClampedArray(srcW * srcH * 4); // Dummy RGBA

    const preprocessed = manager.preprocessImageData(pixels, srcW, srcH, 640, 640);

    expect(preprocessed.tensor.dims).toEqual([1, 3, 640, 640]);
    expect(preprocessed.scaleX).toBeCloseTo(640 / 800, 3);
    expect(preprocessed.originalWidth).toBe(800);
    expect(preprocessed.originalHeight).toBe(600);
  });
});
