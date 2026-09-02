import type { CandidateDetection, UnifiedElement } from "../types";
import { detectByRules } from "./rule-detector";
import { detectByNer } from "./ml-detector";
import type { DetectionOptions } from "./types";

/** Part 2 orchestrator: real rules + optional real/injected NER. */
export async function detectSensitiveData(
  elements: UnifiedElement[],
  options: DetectionOptions = {}
): Promise<CandidateDetection[]> {
  const rules = options.enableRules === false ? [] : detectByRules(elements);
  const ner = options.enableNer === false || !options.nerPipeline
    ? []
    : await detectByNer(elements, options.nerPipeline);

  // Deduplicate same element/type/value while preferring the highest confidence.
  const best = new Map<string, CandidateDetection>();
  for (const d of [...rules, ...ner]) {
    const key = `${d.elementId}|${d.type}|${(d.matchedText ?? "").toLowerCase()}`;
    const previous = best.get(key);
    if (!previous || d.confidence > previous.confidence) best.set(key, d);
  }
  return [...best.values()];
}

export { detectByRules } from "./rule-detector";
export { detectByNer, createTransformersJsNerDetector } from "./ml-detector";
export type { DetectionOptions, NerEntity, NerPipeline, DetectionResult, ElementDetectionInput } from "./types";
