/**
 * Types for Reference Token Lifecycle and Resolution
 */

import { SecretCategory } from "../../../shared/types";

export interface ReferenceMapping {
  token: string;              // e.g. "EMAIL_1" or "<EMAIL_1>"
  category: SecretCategory;
  domain: string;             // Domain scope e.g. "insurance.example.com"
  elementId?: string;         // Associated DOM element ID
  secretId?: string;          // If mapped to a persistent secret
  createdAt: number;
  expiresAt: number;
}

export interface ResolveTokenOptions {
  domain: string;
  referenceToken: string;
  expectedCategory?: SecretCategory;
  masterKey: CryptoKey;
}

export interface ResolvedSecretValue {
  token: string;
  category: SecretCategory;
  value: string;
  domain: string;
  label: string;
}
