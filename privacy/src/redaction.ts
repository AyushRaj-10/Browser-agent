/**
 * Redaction Engine
 *
 * Turns a ClassifiedDetection into a TreatmentPlan. Two responsibilities:
 *   1. decideAction()  — which of KEEP/MASK/REPLACE/BLOCK applies
 *   2. ReferenceTokenGenerator + maskValue() — the actual sanitized substitute
 *
 * Design choice: treatment is keyed primarily by TYPE, not just sensitivity
 * tier, because two HIGHLY_SENSITIVE things don't deserve the same treatment.
 * A password must never leave the device in any form (BLOCK) — but a credit
 * card can often be partially useful to the agent as a masked value
 * ("card ending 1234") without ever exposing the full number.
 */

import { ProtectedElementType, ProtectionAction, ProtectionSensitivity } from "../../shared/types";
import { ClassifiedDetection, TreatmentPlan } from "./types";

/** Per-type override. Anything not listed here falls back to the sensitivity-tier default. */
const ACTION_BY_TYPE: Partial<Record<ProtectedElementType, ProtectionAction>> = {
  PASSWORD: "BLOCK", // never derived from the page anyway — P4 resolves this locally at execution time
  FACE: "BLOCK", // no semantic substitute for a face; redact the image region entirely
  SIGNATURE: "BLOCK",
  ID_CARD: "BLOCK",
  CREDIT_CARD: "MASK", // partial disclosure (last 4 digits) is usually enough for the agent to reason
  EMAIL: "REPLACE",
  PHONE: "REPLACE",
  PERSON: "REPLACE",
  DOCUMENT: "MASK",
};

const ACTION_BY_SENSITIVITY: Record<ProtectionSensitivity, ProtectionAction> = {
  SAFE: "KEEP",
  SENSITIVE: "REPLACE",
  HIGHLY_SENSITIVE: "BLOCK",
};

export function decideAction(type: ProtectedElementType, sensitivity: ProtectionSensitivity): ProtectionAction {
  return ACTION_BY_TYPE[type] ?? ACTION_BY_SENSITIVITY[sensitivity];
}

/**
 * Assigns stable, human-readable reference tokens (EMAIL_1, EMAIL_2, PHONE_1...)
 * scoped to a single SanitizedContext build. P4 resolves these back to real
 * values only at execution time — the token itself carries meaning ("this is
 * an email") without carrying the value.
 */
export class ReferenceTokenGenerator {
  private counters: Partial<Record<ProtectedElementType, number>> = {};

  next(type: ProtectedElementType): string {
    const n = (this.counters[type] ?? 0) + 1;
    this.counters[type] = n;
    return `${type}_${n}`;
  }
}

/**
 * Produces a partially-visible value for MASK treatment. Keeps just enough
 * to be useful for confirmation ("is this the right card?") without
 * reconstructing the sensitive value.
 */
export function maskValue(type: ProtectedElementType, rawValue: string | undefined): string {
  if (!rawValue) return "***";
  const digits = rawValue.replace(/\D/g, "");

  if (type === "CREDIT_CARD" && digits.length >= 4) {
    return `**** **** **** ${digits.slice(-4)}`;
  }
  if (rawValue.length <= 4) {
    return "*".repeat(rawValue.length);
  }
  return `${"*".repeat(rawValue.length - 4)}${rawValue.slice(-4)}`;
}

/**
 * Builds the full treatment (action + token/mask) for one classified detection.
 * tokenGen is passed in (not created here) so all detections in the same
 * SanitizedContext share one counter and don't collide on e.g. EMAIL_1 twice.
 */
export function buildTreatment(
  detection: ClassifiedDetection,
  tokenGen: ReferenceTokenGenerator
): TreatmentPlan {
  const action = decideAction(detection.type, detection.sensitivity);

  switch (action) {
    case "KEEP":
      return { action };
    case "BLOCK":
      return { action };
    case "MASK":
      return { action, maskedValue: maskValue(detection.type, detection.matchedText) };
    case "REPLACE":
      return { action, referenceToken: tokenGen.next(detection.type) };
  }
}
