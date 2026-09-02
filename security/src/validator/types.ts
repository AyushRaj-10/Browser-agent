/**
 * Types and Interfaces for Local Action Validation Engine
 */

import {
  AgentAction,
  ValidationResult,
  ValidationContext,
  RiskLevel,
} from "../../../shared/types";

export type { AgentAction, ValidationResult, ValidationContext, RiskLevel };

export interface ValidationRuleResult {
  passed: boolean;
  reason?: string;
  riskLevel?: RiskLevel;
}

export interface IValidationRule {
  name: string;
  description: string;
  validate(
    action: AgentAction,
    context: ValidationContext
  ): Promise<ValidationRuleResult> | ValidationRuleResult;
}
