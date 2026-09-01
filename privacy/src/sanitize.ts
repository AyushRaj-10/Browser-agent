/**
 * Sanitize — the entry point of Part 3.
 *
 * sanitize(task, elements, detections, screenshot) -> SanitizedContext
 *
 * This is the ONLY function P5 (or anything downstream) should call. It
 * fulfils docs/INTERFACES.md Interface 2 exactly, and it's the sole place
 * allowed to decide what a "safe enough" page representation looks like —
 * per docs/COMPONENT_OWNERSHIP.md, Privacy Engine must never let a caller
 * bypass this and reach into raw elements directly.
 */

import {
  ProtectedElement,
  SanitizedContext,
  SanitizedPage,
} from "../../shared/types";
import { CandidateDetection, ClassifiedDetection, TreatmentPlan, UnifiedElement } from "./types";
import { classifyAll } from "./classifier";
import { buildTreatment, ReferenceTokenGenerator } from "./redaction";

export type SanitizeInput = {
  task: string;
  pageUrl: string;
  pageTitle?: string;
  elements: UnifiedElement[]; // output of the merge step (Part 1)
  detections: CandidateDetection[]; // output of the detection step (Part 2)
  screenshot?: string; // raw screenshot is intentionally NOT included unless explicitly opted in — see note below
};

/**
 * D010 (Fail Closed for Privacy): if classification/redaction throws for any
 * detection, that element is forced to BLOCK rather than silently passed
 * through as SAFE. We never let a bug turn into a leak.
 */
export function sanitize(input: SanitizeInput): SanitizedContext {
  const { task, pageUrl, pageTitle, elements, detections } = input;

  const domFieldTypeById: Record<string, string | undefined> = {};
  for (const el of elements) domFieldTypeById[el.id] = el.domFieldType;

  let classified: ClassifiedDetection[];
  try {
    classified = classifyAll(detections, domFieldTypeById);
  } catch (err) {
    // Classification itself failed — block every candidate rather than guess.
    classified = detections.map((d) => ({ ...d, sensitivity: "HIGHLY_SENSITIVE" as const }));
  }

  const tokenGen = new ReferenceTokenGenerator();
  const protectedElements: ProtectedElement[] = [];
  // detection.id -> { token/mask/action } so the page-render step below can look it up
  const treatmentByDetectionId = new Map<string, TreatmentPlan>();

  for (const d of classified) {
    let treatment;
    try {
      treatment = buildTreatment(d, tokenGen);
    } catch (err) {
      treatment = { action: "BLOCK" as const }; // fail closed on any per-item error too
    }
    treatmentByDetectionId.set(d.id, treatment);

    protectedElements.push({
      id: d.id,
      type: d.type,
      source: d.source,
      confidence: d.confidence,
      bbox: d.bbox,
      sensitivity: d.sensitivity,
      action: treatment.action,
    });
  }

  // A given UnifiedElement may have zero, one, or multiple detections against it
  // (e.g. a bio field that's both a PERSON name and contains an EMAIL). The most
  // restrictive treatment for that element wins — never the most permissive.
  const detectionsByElement = new Map<string, ClassifiedDetection[]>();
  for (const d of classified) {
    const list = detectionsByElement.get(d.elementId) ?? [];
    list.push(d);
    detectionsByElement.set(d.elementId, list);
  }

  const page: SanitizedPage = {
    url: pageUrl,
    title: pageTitle,
    elements: elements.map((el) => renderElement(el, detectionsByElement.get(el.id), treatmentByDetectionId)),
  };

  return {
    task,
    page,
    protectedElements,
    // Raw screenshots are local-only by default (docs/PRIVACY.md). Only forward
    // one if the caller explicitly opted in AND every detection on it resolved
    // to KEEP/MASK/REPLACE (i.e. nothing on screen required a BLOCK).
    screenshot: input.screenshot && protectedElements.every((p) => p.action !== "BLOCK" || p.source !== "VISION")
      ? input.screenshot
      : undefined,
  };
}

const ACTION_RANK: Record<string, number> = { KEEP: 0, MASK: 1, REPLACE: 2, BLOCK: 3 };

function renderElement(
  el: UnifiedElement,
  detections: ClassifiedDetection[] | undefined,
  treatmentByDetectionId: Map<string, TreatmentPlan>
): SanitizedPage["elements"][number] {
  if (!detections || detections.length === 0) {
    return { id: el.id, type: el.source, label: el.label, text: el.text, bbox: el.bbox, isProtected: false };
  }

  // pick the most restrictive treatment among all detections on this element
  const winner = detections.reduce((worst, d) => {
    const t1 = treatmentByDetectionId.get(worst.id)!;
    const t2 = treatmentByDetectionId.get(d.id)!;
    return ACTION_RANK[t2.action] > ACTION_RANK[t1.action] ? d : worst;
  }, detections[0]);
  const treatment = treatmentByDetectionId.get(winner.id)!;

  let text: string | undefined;
  switch (treatment.action) {
    case "KEEP":
      text = el.text;
      break;
    case "MASK":
      text = treatment.maskedValue;
      break;
    case "REPLACE":
      text = `<${treatment.referenceToken}>`;
      break;
    case "BLOCK":
      text = undefined; // omitted entirely — not even a placeholder that hints at content
      break;
  }

  return {
    id: el.id,
    type: el.source,
    label: treatment.action === "BLOCK" ? undefined : el.label,
    text,
    bbox: el.bbox,
    isProtected: true,
    referenceToken: treatment.referenceToken,
  };
}
