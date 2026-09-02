/**
 * Sensitivity Classifier
 *
 * Answers exactly one question per detection: "how sensitive is this,
 * independent of what we later choose to do about it?"
 *
 * Kept deliberately separate from redaction.ts (docs/MODEL_SPEC.md §6):
 * classification is a judgment about risk, treatment is a judgment about
 * usefulness-vs-risk tradeoff. Mixing them makes both harder to test and
 * harder to justify in the SIH writeup.
 */

import { ProtectedElementType, ProtectionSensitivity } from "../../shared/types";
import { CandidateDetection, ClassifiedDetection, ClassifierOptions } from "./types";
import { DEFAULT_THRESHOLDS } from "../../shared/constants";

/** Never leaves the device even as a reference token. */
const HIGHLY_SENSITIVE_TYPES: ProtectedElementType[] = [
  "PASSWORD",
  "FACE",
  "SIGNATURE",
  "ID_CARD",
];

/** Useful to the reasoning model, but must be tokenized before it leaves the device. */
const SENSITIVE_TYPES: ProtectedElementType[] = [
  "EMAIL",
  "PHONE",
  "PERSON",
  "CREDIT_CARD",
  "DOCUMENT",
];

export const DEFAULT_CLASSIFIER_OPTIONS: ClassifierOptions = {
  minConfidence: DEFAULT_THRESHOLDS.OCR_CONFIDENCE, // 0.6 — reuse the project-wide default rather than invent a new one
};

/**
 * Field-level context override: a DOM input explicitly typed "password"
 * or "email" is a stronger, cheaper signal than any regex/ML guess and
 * should win regardless of what the detector reported.
 */
function domFieldOverride(domFieldType: string | undefined): ProtectionSensitivity | null {
  if (!domFieldType) return null;
  const t = domFieldType.toLowerCase();
  if (t === "password") return "HIGHLY_SENSITIVE";
  if (t === "email" || t === "tel") return "SENSITIVE";
  return null;
}

/**
 * Classifies a single candidate detection.
 *
 * Fail-closed rule (D010): a detection we are not confident about is never
 * silently downgraded to SAFE. Low confidence escalates caution instead of
 * reducing it — the worst outcome for a privacy engine is treating something
 * sensitive as safe because the detector was unsure.
 */
export function classifySensitivity(
  detection: CandidateDetection,
  domFieldType?: string,
  options: ClassifierOptions = DEFAULT_CLASSIFIER_OPTIONS
): ProtectionSensitivity {
  const override = domFieldOverride(domFieldType);
  if (override) return override;

  const baseline = baselineSensitivity(detection.type);

  if (detection.confidence < options.minConfidence) {
    // Uncertain detection: never trust it as SAFE, and escalate SENSITIVE -> HIGHLY_SENSITIVE
    // so an unresolved "is this a face?" guess is blocked, not merely tokenized.
    if (baseline === "SAFE") return "SENSITIVE";
    if (baseline === "SENSITIVE") return "HIGHLY_SENSITIVE";
    return "HIGHLY_SENSITIVE";
  }

  return baseline;
}

function baselineSensitivity(type: ProtectedElementType): ProtectionSensitivity {
  if (HIGHLY_SENSITIVE_TYPES.includes(type)) return "HIGHLY_SENSITIVE";
  if (SENSITIVE_TYPES.includes(type)) return "SENSITIVE";
  return "SAFE"; // OTHER, and any type we don't have a specific rule for
}

/** Batch helper used by sanitize.ts */
export function classifyAll(
  detections: CandidateDetection[],
  domFieldTypeById: Record<string, string | undefined>,
  options: ClassifierOptions = DEFAULT_CLASSIFIER_OPTIONS
): ClassifiedDetection[] {
  return detections.map((d) => ({
    ...d,
    sensitivity: classifySensitivity(d, domFieldTypeById[d.elementId], options),
  }));
}
