/**
 * Action Vocabulary Rule
 * Validates that the requested action is strictly within the allowed vocabulary.
 */

import { IValidationRule, ValidationRuleResult } from "../types";
import { AgentAction, ValidationContext } from "../../../../shared/types";
import { AGENT_ACTION_TYPES, SECURITY_POLICY_ERRORS } from "../../../../shared/constants";

export class ActionTypeRule implements IValidationRule {
  public name = "ActionTypeRule";
  public description = "Ensures action verb is within the authorized vocabulary.";

  private allowedActions = new Set<string>(Object.values(AGENT_ACTION_TYPES));

  public validate(
    action: AgentAction,
    _context: ValidationContext
  ): ValidationRuleResult {
    if (!action || typeof action.action !== "string") {
      return {
        passed: false,
        reason: "Malformed action: action verb is missing or not a string.",
        riskLevel: "BLOCKED",
      };
    }

    const verb = action.action.toUpperCase();

    if (!this.allowedActions.has(verb)) {
      return {
        passed: false,
        reason: `${SECURITY_POLICY_ERRORS.UNKNOWN_ACTION_VOCABULARY}: Action '${action.action}' is not permitted.`,
        riskLevel: "BLOCKED",
      };
    }

    return {
      passed: true,
      riskLevel: "LOW",
    };
  }
}
