import { describe, it, expect } from "vitest";
import { sanitize } from "../src/sanitize";
import { createMockUnifiedElements, createMockDetections } from "../src/mock";

describe("sanitize (end-to-end)", () => {
  const result = sanitize({
    task: "Fill out and submit the profile form",
    pageUrl: "https://example.com/profile",
    pageTitle: "Profile settings",
    elements: createMockUnifiedElements(),
    detections: createMockDetections(),
  });

  it("never includes the raw email, phone, password, or card value anywhere in the output", () => {
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("ayush@gmail.com");
    expect(serialized).not.toContain("98765 43210");
    expect(serialized).not.toContain("hunter2");
    expect(serialized).not.toContain("4111 1111 1111 1234");
  });

  it("replaces the email field with a reference token", () => {
    const emailEl = result.page && (result.page as any).elements.find((e: any) => e.id === "el_email");
    expect(emailEl.text).toBe("<EMAIL_1>");
    expect(emailEl.referenceToken).toBe("EMAIL_1");
  });

  it("masks the credit card down to the last 4 digits", () => {
    const cardEl = (result.page as any).elements.find((e: any) => e.id === "el_card");
    expect(cardEl.text).toBe("**** **** **** 1234");
  });

  it("blocks the password field entirely — no text, no label, no token", () => {
    const pwEl = (result.page as any).elements.find((e: any) => e.id === "el_password");
    expect(pwEl.text).toBeUndefined();
    expect(pwEl.label).toBeUndefined();
    expect(pwEl.referenceToken).toBeUndefined();
  });

  it("leaves the untouched submit button as KEEP / not protected", () => {
    const submitEl = (result.page as any).elements.find((e: any) => e.id === "el_submit");
    expect(submitEl.isProtected).toBe(false);
    expect(submitEl.text).toBe("Submit");
  });

  it("records one ProtectedElement per detection for the dashboard count", () => {
    expect(result.protectedElements.length).toBe(createMockDetections().length);
  });

  it("drops the screenshot when any vision detection was BLOCKed (the low-confidence FACE)", () => {
    expect(result.screenshot).toBeUndefined();
  });
});
