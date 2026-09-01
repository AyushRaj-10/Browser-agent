import { describe, it, expect } from "vitest";
import { decideAction, maskValue, ReferenceTokenGenerator, buildTreatment } from "../src/redaction";
import { ClassifiedDetection } from "../src/types";

describe("decideAction", () => {
  it("PASSWORD is always BLOCK, even if sensitivity somehow computed lower", () => {
    expect(decideAction("PASSWORD", "SENSITIVE")).toBe("BLOCK");
  });

  it("CREDIT_CARD is MASK, not full BLOCK, so partial info survives", () => {
    expect(decideAction("CREDIT_CARD", "HIGHLY_SENSITIVE")).toBe("MASK");
  });

  it("EMAIL is REPLACE (tokenized)", () => {
    expect(decideAction("EMAIL", "SENSITIVE")).toBe("REPLACE");
  });

  it("falls back to sensitivity-tier default for unmapped types", () => {
    expect(decideAction("OTHER", "SAFE")).toBe("KEEP");
  });
});

describe("maskValue", () => {
  it("keeps the last 4 digits of a credit card", () => {
    expect(maskValue("CREDIT_CARD", "4111111111111234")).toBe("**** **** **** 1234");
  });

  it("falls back to full mask for very short values", () => {
    expect(maskValue("OTHER", "abc")).toBe("***");
  });
});

describe("ReferenceTokenGenerator", () => {
  it("increments per type independently and never repeats a token", () => {
    const gen = new ReferenceTokenGenerator();
    expect(gen.next("EMAIL")).toBe("EMAIL_1");
    expect(gen.next("EMAIL")).toBe("EMAIL_2");
    expect(gen.next("PHONE")).toBe("PHONE_1");
  });
});

describe("buildTreatment", () => {
  it("BLOCK actions never carry a token or masked value that could leak content", () => {
    const detection: ClassifiedDetection = {
      id: "d1",
      elementId: "el1",
      type: "PASSWORD",
      source: "DOM",
      confidence: 1,
      detectorName: "dom-heuristic",
      sensitivity: "HIGHLY_SENSITIVE",
    };
    const treatment = buildTreatment(detection, new ReferenceTokenGenerator());
    expect(treatment.action).toBe("BLOCK");
    expect(treatment.referenceToken).toBeUndefined();
    expect(treatment.maskedValue).toBeUndefined();
  });
});
