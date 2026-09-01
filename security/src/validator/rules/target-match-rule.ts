/**
 * Target Existence and Interactability Rule
 * Verifies that target elements exist in the current DOM or perception state.
 */

import { IValidationRule, ValidationRuleResult } from "../types";
import { AgentAction, ValidationContext, DomElement } from "../../../../shared/types";
import { SECURITY_POLICY_ERRORS } from "../../../../shared/constants";

export class TargetMatchRule implements IValidationRule {
  public name = "TargetMatchRule";
  public description = "Verifies target element exists and is interactable.";

  public validate(
    action: AgentAction,
    context: ValidationContext
  ): ValidationRuleResult {
    const verb = action.action.toUpperCase();

    // WAIT and NAVIGATE do not require specific DOM targets
    if (verb === "WAIT" || verb === "NAVIGATE") {
      return { passed: true, riskLevel: "LOW" };
    }

    if (!action.target || typeof action.target !== "string") {
      return {
        passed: false,
        reason: `${SECURITY_POLICY_ERRORS.TARGET_NOT_FOUND}: Target identifier is missing.`,
        riskLevel: "BLOCKED",
      };
    }

    const targetId = action.target.trim().toLowerCase();

    // 1. Look for element in DOM elements
    const domMatch = context.domElements?.find(
      (el: DomElement) =>
        el.id?.toLowerCase() === targetId ||
        el.tag?.toLowerCase() === targetId ||
        (el.type && el.type.toLowerCase() === targetId) ||
        (el.label && el.label.toLowerCase() === targetId)
    );

    // 2. Look for element in perception elements
    const perceptionMatch = context.perceptionElements?.find(
      (el) => el.id?.toLowerCase() === targetId
    );

    if (!domMatch && !perceptionMatch) {
      return {
        passed: false,
        reason: `${SECURITY_POLICY_ERRORS.TARGET_NOT_FOUND}: Element '${action.target}' not found in current page state.`,
        riskLevel: "HIGH",
      };
    }

    // 3. If DOM element found, check interactability (disabled/hidden)
    if (domMatch) {
      if (domMatch.disabled) {
        return {
          passed: false,
          reason: `${SECURITY_POLICY_ERRORS.TARGET_NOT_INTERACTABLE}: Target element '${action.target}' is currently disabled.`,
          riskLevel: "MEDIUM",
        };
      }

      if (domMatch.visible === false) {
        return {
          passed: false,
          reason: `${SECURITY_POLICY_ERRORS.TARGET_NOT_INTERACTABLE}: Target element '${action.target}' is not visible.`,
          riskLevel: "MEDIUM",
        };
      }
    }

    return {
      passed: true,
      riskLevel: "LOW",
    };
  }
}
