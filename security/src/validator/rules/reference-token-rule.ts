/**
 * Reference Token Validity Rule
 * Validates reference tokens for TYPE_REFERENCE actions.
 */

import { IValidationRule, ValidationRuleResult } from "../types";
import { AgentAction, ValidationContext } from "../../../../shared/types";
import { SECURITY_POLICY_ERRORS } from "../../../../shared/constants";

export class ReferenceTokenRule implements IValidationRule {
  public name = "ReferenceTokenRule";
  public description = "Ensures TYPE_REFERENCE actions contain valid, authorized reference tokens.";

  public validate(
    action: AgentAction,
    context: ValidationContext
  ): ValidationRuleResult {
    const verb = action.action.toUpperCase();

    if (verb === "TYPE_REFERENCE") {
      if (!action.reference || typeof action.reference !== "string") {
        return {
          passed: false,
          reason: `${SECURITY_POLICY_ERRORS.INVALID_REFERENCE_TOKEN}: TYPE_REFERENCE action missing reference token.`,
          riskLevel: "BLOCKED",
        };
      }

      const normalizedToken = action.reference
        .trim()
        .toUpperCase()
        .replace(/[<>]/g, "");

      // Strictly reject any password reference token
      if (normalizedToken.startsWith("PASSWORD")) {
        return {
          passed: false,
          reason: `${SECURITY_POLICY_ERRORS.PASSWORD_AUTOTYPE_FORBIDDEN}: Password reference tokens are forbidden.`,
          riskLevel: "BLOCKED",
        };
      }

      // Check against active reference map if provided in context
      if (context.activeReferenceMap) {
        const refEntry = context.activeReferenceMap[normalizedToken];
        if (!refEntry) {
          return {
            passed: false,
            reason: `${SECURITY_POLICY_ERRORS.INVALID_REFERENCE_TOKEN}: Reference token '${action.reference}' was not issued for the current page context.`,
            riskLevel: "HIGH",
          };
        }
      }
    }

    return {
      passed: true,
      riskLevel: "LOW",
    };
  }
}
