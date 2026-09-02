import { describe, expect, it } from "vitest";
import { detectSensitiveData } from "../src/detection";
import type { UnifiedElement } from "../src/types";

const elements: UnifiedElement[] = [
  { id: "a", source: "DOM", text: "Contact varun@example.com or +91 98765 43210" },
  { id: "b", source: "DOM", text: "4111 1111 1111 1111" },
  { id: "c", source: "DOM", domFieldType: "password", text: "secret" },
  { id: "d", source: "OCR", text: "John Smith submitted the form" },
];

describe("hybrid detection", () => {
  it("detects structured PII using rules", async () => {
    const result = await detectSensitiveData(elements, { enableNer: false });
    expect(result.some((d) => d.type === "EMAIL")).toBe(true);
    expect(result.some((d) => d.type === "PHONE")).toBe(true);
    expect(result.some((d) => d.type === "CREDIT_CARD")).toBe(true);
    expect(result.some((d) => d.type === "PASSWORD" && d.detectorName === "dom-heuristic")).toBe(true);
  });

  it("accepts an injected NER pipeline and maps PER to PERSON", async () => {
    const result = await detectSensitiveData(elements, {
      enableRules: false,
      nerPipeline: async () => [{ entity_group: "PER", word: "John Smith", score: 0.96, start: 0, end: 10 }],
    });
    expect(result).toHaveLength(4);
    expect(result.every((d) => d.type === "PERSON" && d.detectorName === "ner")).toBe(true);
  });
});
