/**
 * Canonical Constants for Privacy-Preserving Browser Agent
 */

export const SENSITIVITY_LEVELS = {
  SAFE: "SAFE",
  SENSITIVE: "SENSITIVE",
  HIGHLY_SENSITIVE: "HIGHLY_SENSITIVE",
} as const;

export const PROTECTION_ACTIONS = {
  KEEP: "KEEP",
  MASK: "MASK",
  REPLACE: "REPLACE",
  BLOCK: "BLOCK",
} as const;

export const ELEMENT_SOURCES = {
  DOM: "DOM",
  OCR: "OCR",
  VISION: "VISION",
} as const;

export const VISION_ELEMENT_TYPES = {
  // UI Interactive Elements
  BUTTON: "BUTTON",
  INPUT: "INPUT",
  SELECT: "SELECT",
  CHECKBOX: "CHECKBOX",
  MODAL: "MODAL",
  ICON: "ICON",
  IMAGE: "IMAGE",
  AVATAR: "AVATAR",
  
  // Sensitive Visual Entities
  FACE: "FACE",
  SIGNATURE: "SIGNATURE",
  DOCUMENT: "DOCUMENT",
  ID_CARD: "ID_CARD",
  QR_CODE: "QR_CODE",
  BARCODE: "BARCODE",
  OTHER: "OTHER",
} as const;

export const AGENT_ACTION_TYPES = {
  CLICK: "CLICK",
  SCROLL: "SCROLL",
  TYPE: "TYPE",
  SELECT: "SELECT",
} as const;

export const DEFAULT_THRESHOLDS = {
  VISION_CONFIDENCE: 0.5,
  OCR_CONFIDENCE: 0.6,
  IOU_NMS_THRESHOLD: 0.45,
  VISUAL_DIFF_SIMILARITY_THRESHOLD: 0.98,
  DEBOUNCE_INFERENCE_MS: 500,
} as const;
