export { sanitize } from "./sanitize";
export type { SanitizeInput } from "./sanitize";

export { classifySensitivity, classifyAll, DEFAULT_CLASSIFIER_OPTIONS } from "./classifier";
export { decideAction, buildTreatment, maskValue, ReferenceTokenGenerator } from "./redaction";

export type {
  UnifiedElement,
  CandidateDetection,
  ClassifiedDetection,
  TreatmentPlan,
  ClassifierOptions,
} from "./types";

export {
  createMockUnifiedElements,
  createMockDetections,
  createMockSanitizedContext,
} from "./mock";

// Part 2 — Hybrid Detection (rules + optional browser-side Transformers.js NER)
export {
  detectSensitiveData,
  detectByRules,
  detectByNer,
  createTransformersJsNerDetector,
} from "./detection";
export type {
  DetectionOptions,
  NerEntity,
  NerPipeline,
  DetectionResult,
  ElementDetectionInput,
} from "./detection";
