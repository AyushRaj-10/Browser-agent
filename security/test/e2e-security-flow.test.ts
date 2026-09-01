/**
 * End-to-End Security & Privacy Flow Tests (SIH Insurance Claim Demo Workflow)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SecretSetupController } from "../src/controller/secret-setup-controller";
import { ActionValidator } from "../src/validator/action-validator";
import { createMockInsuranceFormContext, MOCK_VALID_INSURANCE_ACTIONS } from "../src/mock/mock-security-context";
import { AgentAction } from "../../shared/types";

describe("E2E Security & Reference Resolution Flow — SIH Insurance Claim Demo", () => {
  let controller: SecretSetupController;
  let validator: ActionValidator;

  beforeEach(async () => {
    controller = new SecretSetupController();
    await controller.unlock();
    await controller.preloadInsuranceDemoProfile();
    validator = new ActionValidator();
  });

  it("completes full end-to-end insurance claim form filling with zero raw PII transmitted to model", async () => {
    // 1. Verify credentials are encrypted in local store
    const storedList = await controller.listSecrets();
    expect(storedList.length).toBe(5);

    const refManager = controller.getReferenceManager();
    const resolver = controller.getReferenceResolver();
    const masterKey = await controller.getMasterKey();

    // 2. Simulated Page Context with live DOM and session references
    const context = createMockInsuranceFormContext({
      activeReferenceMap: refManager.getActiveReferencesForDomain("claims.insurance-demo.com"),
    });

    // 3. Simulated VLM response received by extension (only contains reference tokens)
    const vlmActions: AgentAction[] = MOCK_VALID_INSURANCE_ACTIONS;

    // Verify VLM actions contain ZERO raw sensitive values
    for (const act of vlmActions) {
      if (act.reference) {
        expect(act.reference).not.toContain("ayush@gmail.com");
        expect(act.reference).not.toContain("9876543210");
        expect(act.reference).not.toContain("Ayush Raj");
      }
    }

    // 4. Local Action Validation Phase
    const validationResults = await validator.validateActions(vlmActions, context);
    for (const vRes of validationResults) {
      expect(vRes.allowed).toBe(true);
      expect(vRes.riskLevel).toBe("LOW");
    }

    // 5. Browser Execution Phase (Person 6 Executor simulation)
    // Reference resolution happens strictly here on device before DOM entry
    const executedDomValues: Record<string, string> = {};

    for (const act of vlmActions) {
      if (act.action === "TYPE_REFERENCE") {
        const resolved = await resolver.resolveActionReference(
          act,
          "claims.insurance-demo.com",
          masterKey
        );
        expect(resolved.resolvedValue).toBeDefined();
        executedDomValues[act.target] = resolved.resolvedValue!;
      }
    }

    // 6. Assert all DOM fields were filled with correct values on-device
    expect(executedDomValues["input_name"]).toBe("Ayush Raj");
    expect(executedDomValues["input_email"]).toBe("ayush@gmail.com");
    expect(executedDomValues["input_phone"]).toBe("9876543210");
    expect(executedDomValues["input_policy"]).toBe("POL12345");
  });
});
