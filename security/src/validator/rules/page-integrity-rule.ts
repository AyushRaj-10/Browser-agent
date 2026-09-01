/**
 * Page Integrity and Navigation Safeguard Rule
 * Checks URL protocol safety and ensures navigation actions stay within authorized domains.
 */

import { IValidationRule, ValidationRuleResult } from "../types";
import { AgentAction, ValidationContext } from "../../../../shared/types";
import { SECURITY_POLICY_ERRORS } from "../../../../shared/constants";

export class PageIntegrityRule implements IValidationRule {
  public name = "PageIntegrityRule";
  public description = "Prevents malicious navigation and cross-origin hijacks.";

  public validate(
    action: AgentAction,
    context: ValidationContext
  ): ValidationRuleResult {
    const verb = action.action.toUpperCase();

    if (verb === "NAVIGATE") {
      const urlToNavigate = action.value || action.target;
      if (!urlToNavigate) {
        return {
          passed: false,
          reason: "Navigation URL is missing.",
          riskLevel: "BLOCKED",
        };
      }

      let parsed: URL;
      try {
        parsed = new URL(urlToNavigate, context.currentUrl);
      } catch {
        return {
          passed: false,
          reason: "Invalid navigation URL format.",
          riskLevel: "BLOCKED",
        };
      }

      // Enforce safe protocols: only http: and https:
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return {
          passed: false,
          reason: `${SECURITY_POLICY_ERRORS.UNAUTHORIZED_NAVIGATION}: Protocol '${parsed.protocol}' is forbidden.`,
          riskLevel: "BLOCKED",
        };
      }

      // Check allowed domains if specified
      if (context.allowedDomains && context.allowedDomains.length > 0) {
        const destHost = parsed.hostname.toLowerCase();
        const isAllowed = context.allowedDomains.some((allowed) => {
          const norm = allowed.toLowerCase();
          return (
            norm === "*" ||
            destHost === norm ||
            destHost.endsWith("." + norm)
          );
        });

        if (!isAllowed) {
          return {
            passed: false,
            reason: `${SECURITY_POLICY_ERRORS.UNAUTHORIZED_NAVIGATION}: Destination host '${destHost}' is not in allowed domain whitelist.`,
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
