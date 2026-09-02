/**
 * Local Action Validator Engine
 * The trusted device-local gatekeeper between remote VLM reasoning and browser execution.
 */

import {
  AgentAction,
  ValidationContext,
  ValidationResult,
  RiskLevel,
} from "../../../shared/types";
import { IValidationRule } from "./types";
import { ActionTypeRule } from "./rules/action-type-rule";
import { TargetMatchRule } from "./rules/target-match-rule";
import { PageIntegrityRule } from "./rules/page-integrity-rule";
import { SafetyRule } from "./rules/safety-rule";
import { ReferenceTokenRule } from "./rules/reference-token-rule";

export class ActionValidator {
  private rules: IValidationRule[] = [];

  constructor(customRules?: IValidationRule[]) {
    if (customRules && customRules.length > 0) {
      this.rules = customRules;
    } else {
      // Default rule pipeline (ordered by priority)
      this.rules = [
        new ActionTypeRule(),
        new SafetyRule(),
        new TargetMatchRule(),
        new PageIntegrityRule(),
        new ReferenceTokenRule(),
      ];
    }
  }

  /**
   * Adds an additional validation rule to the pipeline.
   */
  public addRule(rule: IValidationRule): void {
    this.rules.push(rule);
  }

  /**
   * Validates an AgentAction against the current ValidationContext.
   *
   * @param action The proposed action from remote reasoning or fast-path
   * @param context Current browser page DOM, perception, and security context
   * @returns ValidationResult with allowed status, reason, and risk level
   */
  public async validateAction(
    action: AgentAction,
    context: ValidationContext
  ): Promise<ValidationResult> {
    const timestamp = Date.now();

    if (!action) {
      return {
        allowed: false,
        reason: "Validation failed: Action object is null or undefined.",
        action: { action: "WAIT", target: "" },
        riskLevel: "BLOCKED",
        timestamp,
      };
    }

    let highestRisk: RiskLevel = "LOW";

    for (const rule of this.rules) {
      const result = await rule.validate(action, context);

      if (!result.passed) {
        return {
          allowed: false,
          reason: result.reason || `Validation rule '${rule.name}' rejected the action.`,
          action,
          riskLevel: result.riskLevel || "BLOCKED",
          timestamp,
        };
      }

      if (result.riskLevel === "MEDIUM" && highestRisk === "LOW") {
        highestRisk = "MEDIUM";
      } else if (result.riskLevel === "HIGH") {
        highestRisk = "HIGH";
      }
    }

    // Produce sanitized action with normalized action verb
    const sanitizedAction: AgentAction = {
      action: action.action.toUpperCase() as any,
      target: action.target?.trim(),
      reference: action.reference?.trim(),
      value: action.value,
    };

    return {
      allowed: true,
      reason: "Action passed all local security and integrity checks.",
      action,
      sanitizedAction,
      riskLevel: highestRisk,
      timestamp,
    };
  }

  /**
   * Validates an array of batch actions sequentially.
   */
  public async validateActions(
    actions: AgentAction[],
    context: ValidationContext
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    for (const act of actions) {
      const res = await this.validateAction(act, context);
      results.push(res);
      // If one action is blocked in a pipeline, stop execution
      if (!res.allowed) {
        break;
      }
    }
    return results;
  }
}
