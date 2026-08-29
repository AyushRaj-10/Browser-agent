/**
 * Runtime Type Validators and Guards for Shared Contracts
 */

import {
  DomElement,
  VisionElement,
  OcrElement,
  ProtectedElement,
  PerceptionResult,
  BoundingBox,
  AgentAction,
  ValidationResult,
} from "./types";

export function isBoundingBox(val: unknown): val is BoundingBox {
  return (
    Array.isArray(val) &&
    val.length === 4 &&
    val.every((n) => typeof n === "number" && !isNaN(n) && n >= 0)
  );
}

export function isVisionElement(val: unknown): val is VisionElement {
  if (!val || typeof val !== "object") return false;
  const obj = val as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    typeof obj.type === "string" &&
    isBoundingBox(obj.bbox) &&
    typeof obj.confidence === "number" &&
    obj.confidence >= 0 &&
    obj.confidence <= 1
  );
}

export function isOcrElement(val: unknown): val is OcrElement {
  if (!val || typeof val !== "object") return false;
  const obj = val as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    typeof obj.text === "string" &&
    isBoundingBox(obj.bbox) &&
    typeof obj.confidence === "number" &&
    obj.confidence >= 0 &&
    obj.confidence <= 1
  );
}

export function isDomElement(val: unknown): val is DomElement {
  if (!val || typeof val !== "object") return false;
  const obj = val as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    typeof obj.tag === "string" &&
    (obj.bbox === undefined || isBoundingBox(obj.bbox))
  );
}

export function isProtectedElement(val: unknown): val is ProtectedElement {
  if (!val || typeof val !== "object") return false;
  const obj = val as Record<string, unknown>;
  const validSources = ["DOM", "OCR", "VISION"];
  const validSensitivities = ["SAFE", "SENSITIVE", "HIGHLY_SENSITIVE"];
  const validActions = ["KEEP", "MASK", "REPLACE", "BLOCK"];

  return (
    typeof obj.id === "string" &&
    typeof obj.type === "string" &&
    typeof obj.source === "string" &&
    validSources.includes(obj.source) &&
    typeof obj.confidence === "number" &&
    typeof obj.sensitivity === "string" &&
    validSensitivities.includes(obj.sensitivity) &&
    typeof obj.action === "string" &&
    validActions.includes(obj.action) &&
    (obj.bbox === undefined || isBoundingBox(obj.bbox))
  );
}

export function isPerceptionResult(val: unknown): val is PerceptionResult {
  if (!val || typeof val !== "object") return false;
  const obj = val as Record<string, unknown>;
  return (
    typeof obj.pageUrl === "string" &&
    typeof obj.timestamp === "number" &&
    Array.isArray(obj.dom) &&
    obj.dom.every(isDomElement) &&
    Array.isArray(obj.vision) &&
    obj.vision.every(isVisionElement) &&
    Array.isArray(obj.ocr) &&
    obj.ocr.every(isOcrElement)
  );
}

export function isAgentAction(val: unknown): val is AgentAction {
  if (!val || typeof val !== "object") return false;
  const obj = val as Record<string, unknown>;
  const validActions = ["CLICK", "SCROLL", "TYPE", "SELECT"];
  return (
    typeof obj.action === "string" &&
    validActions.includes(obj.action) &&
    typeof obj.target === "string"
  );
}

export function isValidationResult(val: unknown): val is ValidationResult {
  if (!val || typeof val !== "object") return false;
  const obj = val as Record<string, unknown>;
  return typeof obj.allowed === "boolean";
}
