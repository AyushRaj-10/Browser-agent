import type { CandidateDetection, UnifiedElement } from "../types";
import type { NerEntity, NerPipeline } from "./types";

/**
 * Real browser-side Transformers.js integration.
 * Model weights are downloaded/cached by Transformers.js at runtime; this module
 * does not embed fake NER results. Tests should inject a NerPipeline instead.
 */
export async function createTransformersJsNerDetector(): Promise<NerPipeline> {
  const transformers = await import("@xenova/transformers");
  const pipeline = await transformers.pipeline("token-classification", "Xenova/bert-base-NER");

  return async (text: string): Promise<NerEntity[]> => {
    const result = await pipeline(text, { aggregation_strategy: "simple" } as never);
    return result as unknown as NerEntity[];
  };
}

function normalizeLabel(entity: NerEntity): string {
  return (entity.entity_group ?? entity.entity ?? "").replace(/^B-|^I-/, "").toUpperCase();
}

/** Maps model entities to the privacy contract. PERSON is currently actionable. */
export async function detectByNer(elements: UnifiedElement[], nerPipeline: NerPipeline): Promise<CandidateDetection[]> {
  const out: CandidateDetection[] = [];
  let counter = 0;

  for (const el of elements) {
    const text = el.text?.trim();
    if (!text) continue;
    const entities = await nerPipeline(text);

    for (const entity of entities) {
      const label = normalizeLabel(entity);
      if (label !== "PER" && label !== "PERSON") continue;
      const matchedText = entity.word?.trim() || text.slice(entity.start ?? 0, entity.end ?? text.length).trim();
      if (!matchedText) continue;
      out.push({
        id: `ner_${++counter}`,
        elementId: el.id,
        type: "PERSON",
        source: el.source,
        confidence: typeof entity.score === "number" ? entity.score : 0.75,
        bbox: el.bbox,
        matchedText,
        detectorName: "ner",
      });
    }
  }
  return out;
}
