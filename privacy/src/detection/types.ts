import type { CandidateDetection, UnifiedElement } from "../types";

export type DetectionOptions = {
  /** Optional NER implementation. Tests can inject a fake; production can use Transformers.js. */
  nerPipeline?: NerPipeline;
  /** Run regex/DOM heuristics. Defaults to true. */
  enableRules?: boolean;
  /** Run NER when a pipeline is available. Defaults to true. */
  enableNer?: boolean;
};

export type NerEntity = {
  entity_group?: string;
  entity?: string;
  word?: string;
  score?: number;
  start?: number;
  end?: number;
};

export type NerPipeline = (text: string) => Promise<NerEntity[]>;

export type DetectionResult = CandidateDetection[];
export type ElementDetectionInput = Pick<UnifiedElement, "id" | "source" | "text" | "bbox" | "domFieldType" | "label">;
