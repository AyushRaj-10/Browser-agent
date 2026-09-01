/**
 * Mock Fixtures and Helper Factories for Security & Validation
 */

import { ValidationContext, DomElement, AgentAction } from "../../../shared/types";

/**
 * Creates a mock ValidationContext simulating the synthetic insurance claim form.
 */
export function createMockInsuranceFormContext(overrides?: Partial<ValidationContext>): ValidationContext {
  const domElements: DomElement[] = [
    {
      id: "input_name",
      tag: "input",
      type: "text",
      label: "Full Name",
      sensitive: true,
      visible: true,
      disabled: false,
      bbox: [100, 100, 300, 40],
    },
    {
      id: "input_email",
      tag: "input",
      type: "email",
      label: "Email Address",
      sensitive: true,
      visible: true,
      disabled: false,
      bbox: [100, 160, 300, 40],
    },
    {
      id: "input_phone",
      tag: "input",
      type: "tel",
      label: "Phone Number",
      sensitive: true,
      visible: true,
      disabled: false,
      bbox: [100, 220, 300, 40],
    },
    {
      id: "input_policy",
      tag: "input",
      type: "text",
      label: "Policy Number",
      sensitive: true,
      visible: true,
      disabled: false,
      bbox: [100, 280, 300, 40],
    },
    {
      id: "input_amount",
      tag: "input",
      type: "text",
      label: "Claim Amount",
      sensitive: false,
      visible: true,
      disabled: false,
      bbox: [100, 340, 300, 40],
    },
    {
      id: "input_password",
      tag: "input",
      type: "password",
      label: "Account Password",
      sensitive: true,
      visible: true,
      disabled: false,
      bbox: [100, 400, 300, 40],
    },
    {
      id: "btn_submit",
      tag: "button",
      type: "submit",
      text: "Submit Claim",
      sensitive: false,
      visible: true,
      disabled: false,
      bbox: [100, 460, 150, 45],
    },
  ];

  return {
    currentUrl: "https://claims.insurance-demo.com/apply",
    pageTitle: "Insurance Claim Submission",
    domElements,
    activeReferenceMap: {
      NAME_1: { category: "NAME", domain: "claims.insurance-demo.com" },
      EMAIL_1: { category: "EMAIL", domain: "claims.insurance-demo.com" },
      PHONE_1: { category: "PHONE", domain: "claims.insurance-demo.com" },
      POLICY_1: { category: "POLICY", domain: "claims.insurance-demo.com" },
      CLAIM_1: { category: "CUSTOM", domain: "claims.insurance-demo.com" },
    },
    allowedDomains: ["claims.insurance-demo.com", "*.insurance-demo.com"],
    ...overrides,
  };
}

/**
 * Standard synthetic action sequences for testing
 */
export const MOCK_VALID_INSURANCE_ACTIONS: AgentAction[] = [
  { action: "TYPE_REFERENCE", target: "input_name", reference: "NAME_1" },
  { action: "TYPE_REFERENCE", target: "input_email", reference: "EMAIL_1" },
  { action: "TYPE_REFERENCE", target: "input_phone", reference: "PHONE_1" },
  { action: "TYPE_REFERENCE", target: "input_policy", reference: "POLICY_1" },
  { action: "CLICK", target: "btn_submit" },
];
