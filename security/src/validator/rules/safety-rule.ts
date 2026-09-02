/**
 * Safety and Injection Defense Rule
 * Detects prompt injection, malicious script payloads, and enforces password isolation.
 */

import { IValidationRule, ValidationRuleResult } from "../types";
import { AgentAction, ValidationContext, DomElement } from "../../../../shared/types";
import { SECURITY_POLICY_ERRORS } from "../../../../shared/constants";

// Dangerous script injection patterns
const DANGEROUS_PAYLOAD_PATTERNS = [
  /javascript:/i,
  /data:text\/html/i,
  /vbscript:/i,
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,
  /\bdocument\.(?:cookie|location|write)\b/i,
  /\bwindow\.(?:location|localStorage|sessionStorage)\b/i,
  /\beval\s*\(/i,
  /\bFunction\s*\(/i,
  /\bon\w+\s*=/i, // inline event handlers e.g. onerror=, onclick=
];

const PASSWORD_IDENTIFIERS = [
  "password",
  "passwd",
  "pwd",
  "passcode",
  "pin",
  "cvv",
  "cvc",
  "otp",
  "secret",
];

export class SafetyRule implements IValidationRule {
  public name = "SafetyRule";
  public description =
    "Detects prompt-injected script payloads and strictly prohibits automated password interaction.";

  public validate(
    action: AgentAction,
    context: ValidationContext
  ): ValidationRuleResult {
    // 1. Check for prompt-injection / script payload in any action parameter
    const fieldsToInspect = [action.target, action.value, action.reference].filter(
      Boolean
    ) as string[];

    for (const text of fieldsToInspect) {
      for (const pattern of DANGEROUS_PAYLOAD_PATTERNS) {
        if (pattern.test(text)) {
          return {
            passed: false,
            reason: `${SECURITY_POLICY_ERRORS.PROMPT_INJECTION_DETECTED}: Dangerous pattern '${pattern.source}' detected in action payload.`,
            riskLevel: "BLOCKED",
          };
        }
      }
    }

    // 2. Strict Password & High-Risk Field Safety Enforcement
    const targetId = action.target?.trim().toLowerCase();
    const domMatch = context.domElements?.find(
      (el: DomElement) =>
        el.id?.toLowerCase() === targetId ||
        (el.label && el.label.toLowerCase() === targetId) ||
        (el.name && el.name.toLowerCase() === targetId)
    );

    if (domMatch) {
      const isPasswordType = domMatch.type?.toLowerCase() === "password";
      const isPasswordLabel = PASSWORD_IDENTIFIERS.some(
        (id) =>
          domMatch.label?.toLowerCase().includes(id) ||
          domMatch.name?.toLowerCase().includes(id) ||
          domMatch.id?.toLowerCase().includes(id)
      );

      if (isPasswordType || isPasswordLabel) {
        // If action is attempting to type or interact with a password field
        const verb = action.action.toUpperCase();
        if (verb === "TYPE" || verb === "TYPE_REFERENCE" || verb === "SELECT") {
          return {
            passed: false,
            reason: `${SECURITY_POLICY_ERRORS.PASSWORD_AUTOTYPE_FORBIDDEN}: Automated typing into password/PIN field '${action.target}' is strictly prohibited.`,
            riskLevel: "BLOCKED",
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
