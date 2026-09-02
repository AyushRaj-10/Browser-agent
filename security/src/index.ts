/**
 * @browser-agent/security
 * Person 4: Local Secret Store, Web Crypto, Reference Resolution, and Local Action Validation
 */

// Shared Canonical Types, Schemas, & Constants
export * from "../../shared/types";
export * from "../../shared/constants";
export * from "../../shared/schemas";

// Crypto Module
export { KeyDerivationOptions, ExportedKeyBundle } from "./crypto/types";
export * from "./crypto/aes-gcm";
export * from "./crypto/key-manager";

// Storage Module
export { SecretStoreConfig } from "./storage/types";
export * from "./storage/secret-store-interface";
export * from "./storage/memory-secret-store";
export * from "./storage/idb-secret-store";

// Reference Resolution Module
export {
  ReferenceMapping,
  ResolveTokenOptions,
  ResolvedSecretValue,
} from "./references/types";
export * from "./references/reference-manager";
export * from "./references/reference-resolver";

// Action Validator Module
export { ValidationRuleResult, IValidationRule } from "./validator/types";
export * from "./validator/action-validator";
export * from "./validator/rules/action-type-rule";
export * from "./validator/rules/target-match-rule";
export * from "./validator/rules/page-integrity-rule";
export * from "./validator/rules/safety-rule";
export * from "./validator/rules/reference-token-rule";

// Controller & Demo Profiles
export * from "./controller/demo-profiles";
export * from "./controller/secret-setup-controller";

// Mock Fixtures
export * from "./mock/mock-security-context";
