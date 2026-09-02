import { describe, it, expect } from "vitest";
import { classifySensitivity } from "../src/classifier";
import { CandidateDetection } from "../src/types";

function detection(overrides: Partial<CandidateDetection> = {}): CandidateDetection {
  return {
    id: "d1",
    elementId: "el1",
    type: "EMAIL",
    source: "DOM",
    confidence: 0.9,
    detectorName: "regex",
    ...overrides,
  };
}

describe("classifySensitivity", () => {
  it("classifies a confident EMAIL detection as SENSITIVE", () => {
    expect(classifySensitivity(detection({ type: "EMAIL", confidence: 0.9 }))).toBe("SENSITIVE");
  });

  it("classifies PASSWORD as HIGHLY_SENSITIVE regardless of confidence", () => {
    expect(classifySensitivity(detection({ type: "PASSWORD", confidence: 0.99 }))).toBe("HIGHLY_SENSITIVE");
  });

  it("DOM field type=password overrides a low-confidence/mistyped detection", () => {
    expect(
      classifySensitivity(detection({ type: "OTHER", confidence: 0.9 }), "password")
    ).toBe("HIGHLY_SENSITIVE");
  });

  it("fails closed: a low-confidence SAFE-type detection escalates to SENSITIVE, not SAFE", () => {
    expect(classifySensitivity(detection({ type: "OTHER", confidence: 0.1 }))).toBe("SENSITIVE");
  });

  it("fails closed: a low-confidence SENSITIVE-type detection escalates to HIGHLY_SENSITIVE", () => {
    expect(classifySensitivity(detection({ type: "FACE", confidence: 0.1 }))).toBe("HIGHLY_SENSITIVE");
  });

  it("classifies OTHER as SAFE when confidently detected", () => {
    expect(classifySensitivity(detection({ type: "OTHER", confidence: 0.95 }))).toBe("SAFE");
  });
});
