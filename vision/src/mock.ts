import { VisionElement, OcrElement, PerceptionResult } from "../../shared/types";
import { VISION_ELEMENT_TYPES } from "../../shared/constants";
import { PerceptionPipelineResult, CapturedScreenshot } from "./types";

/**
 * Creates mock VisionElement detections for testing and mock pipeline development.
 */
export function createMockVisionElements(width = 1280, height = 720): VisionElement[] {
  return [
    {
      id: "vision_face_1",
      type: VISION_ELEMENT_TYPES.FACE,
      bbox: [Math.round(width * 0.85), 18, 48, 48],
      confidence: 0.96,
    },
    {
      id: "vision_document_1",
      type: VISION_ELEMENT_TYPES.DOCUMENT,
      bbox: [Math.round(width * 0.2), Math.round(height * 0.2), Math.round(width * 0.6), Math.round(height * 0.55)],
      confidence: 0.92,
    },
    {
      id: "vision_button_submit",
      type: VISION_ELEMENT_TYPES.BUTTON,
      bbox: [Math.round(width * 0.45), Math.round(height * 0.68), 120, 36],
      confidence: 0.94,
    },
    {
      id: "vision_input_email",
      type: VISION_ELEMENT_TYPES.INPUT,
      bbox: [Math.round(width * 0.25), Math.round(height * 0.3), 300, 32],
      confidence: 0.89,
    },
  ];
}

/**
 * Creates mock OcrElement detections for testing.
 */
export function createMockOcrElements(width = 1280, height = 720): OcrElement[] {
  return [
    {
      id: "ocr_text_1",
      text: "Personal Profile",
      bbox: [Math.round(width * 0.25), Math.round(height * 0.22), 160, 24],
      confidence: 0.97,
    },
    {
      id: "ocr_text_2",
      text: "john.doe@example.com",
      bbox: [Math.round(width * 0.25), Math.round(height * 0.31), 220, 20],
      confidence: 0.95,
    },
    {
      id: "ocr_text_3",
      text: "+1 (555) 234-5678",
      bbox: [Math.round(width * 0.25), Math.round(height * 0.4), 180, 20],
      confidence: 0.93,
    },
    {
      id: "ocr_text_4",
      text: "Save Changes",
      bbox: [Math.round(width * 0.46), Math.round(height * 0.69), 100, 18],
      confidence: 0.98,
    },
  ];
}

/**
 * Creates a complete mock PerceptionPipelineResult conforming to Person 2 output specs.
 */
export function createMockPerceptionResult(
  width = 1280,
  height = 720
): PerceptionPipelineResult {
  const vision = createMockVisionElements(width, height);
  const ocr = createMockOcrElements(width, height);

  return {
    vision,
    ocr,
    metrics: {
      captureMs: 12,
      visionInferenceMs: 45,
      ocrMs: 65,
      totalMs: 122,
      providerUsed: "mock",
      skippedDueToSimilarity: false,
      elementCount: {
        vision: vision.length,
        ocr: ocr.length,
      },
    },
    screenshotMetadata: {
      width,
      height,
      devicePixelRatio: 1,
      timestamp: Date.now(),
      visualHash: "mock_visual_hash_1234567890abcdef",
    },
  };
}

/**
 * Creates a mock CapturedScreenshot for testing.
 */
export function createMockScreenshot(
  width = 1280,
  height = 720
): CapturedScreenshot {
  return {
    dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    metadata: {
      width,
      height,
      devicePixelRatio: 1,
      timestamp: Date.now(),
      visualHash: "mock_hash_ffff0000ffff0000",
    },
  };
}
