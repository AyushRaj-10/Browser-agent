/**
 * Types local to Part 3 — Sensitivity Classification + Redaction Engine.
 *
 * These are NOT part of shared/types.ts because they are internal handoffs
 * between sub-stages of the Privacy Engine (merge -> detect -> classify -> redact),
 * not the external contracts P1/P2/P5 depend on. The only things that cross
 * the module boundary are PerceptionResult (in) and SanitizedContext (out),
 * both already defined in shared/types.ts.
 */

import {
  BoundingBox,
  ProtectedElementType,
  ProtectionSensitivity,
  ProtectionAction,
} from "../../shared/types";

/**
 * A single element after DOM + OCR + Vision have been merged into one
 * coordinate space (output of the Unified Screen Representation step).
 * Part 3 treats this as its "given" input alongside CandidateDetection[].
 */
export type UnifiedElement = {
  id: string;
  source: "DOM" | "OCR" | "VISION";
  /** e.g. "password" | "email" | "tel" from <input type="..."> — strongest signal available */
  domFieldType?: string;
  label?: string;
  /** the actual visible/entered value, when one exists (DOM value, OCR read text) */
  text?: string;
  bbox?: BoundingBox;
};

/**
 * Output of the detection stage (regex + ML), before sensitivity/treatment
 * have been decided. This is the contract Part 3 expects the detector to hand it.
 */
export type CandidateDetection = {
  id: string;
  /** links back to UnifiedElement.id so redaction can locate the source element */
  elementId: string;
  type: ProtectedElementType;
  source: "DOM" | "OCR" | "VISION";
  confidence: number;
  bbox?: BoundingBox;
  /** the exact substring/value that triggered the match, if extractable */
  matchedText?: string;
  detectorName: "regex" | "ner" | "vision-model" | "dom-heuristic";
};

export type ClassifiedDetection = CandidateDetection & {
  sensitivity: ProtectionSensitivity;
};

export type TreatmentPlan = {
  action: ProtectionAction;
  /** stable per-context id like "EMAIL_1", present only for REPLACE */
  referenceToken?: string;
  /** partially-visible value like "**** 1234", present only for MASK */
  maskedValue?: string;
};

export type ClassifierOptions = {
  /** detections below this confidence are treated as unresolved, not dropped — see D010 fail-closed */
  minConfidence: number;
};
