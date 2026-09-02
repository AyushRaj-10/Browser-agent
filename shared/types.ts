/**
 * Canonical Types for Privacy-Preserving Browser Agent
 * Conforms to docs/DATA_SCHEMAS.md, docs/INTERFACES.md, and backend contracts.
 */

export type BoundingBox = [number, number, number, number]; // [x, y, width, height]

export type DomElement = {
  id: string;
  tag: string;
  name?: string;
  role?: string;
  type?: string;
  label?: string;
  text?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  visible?: boolean;
  checked?: boolean | null;
  sampleValue?: string | null;
  sensitive?: boolean;
  bbox?: BoundingBox;
};

export type VisionElement = {
  id: string;
  type: string;
  bbox: BoundingBox;
  confidence: number;
};

export type OcrElement = {
  id: string;
  text: string;
  bbox: BoundingBox;
  confidence: number;
};

export type ProtectedElementType =
  | "EMAIL"
  | "PHONE"
  | "PASSWORD"
  | "PERSON"
  | "CREDIT_CARD"
  | "GOV_ID"
  | "POLICY"
  | "FACE"
  | "SIGNATURE"
  | "DOCUMENT"
  | "ID_CARD"
  | "OTHER";

export type ProtectionSensitivity = "SAFE" | "SENSITIVE" | "HIGHLY_SENSITIVE";

export type ProtectionAction = "KEEP" | "MASK" | "REPLACE" | "BLOCK";

export type ProtectedElement = {
  id: string;
  type: ProtectedElementType;
  source: "DOM" | "OCR" | "VISION";
  confidence: number;
  bbox?: BoundingBox;
  sensitivity: ProtectionSensitivity;
  action: ProtectionAction;
  referenceToken?: string;
};

export type PerceptionResult = {
  pageUrl: string;
  timestamp: number;
  dom: DomElement[];
  vision: VisionElement[];
  ocr: OcrElement[];
};

export type SanitizedPageElement = {
  id: string;
  type: string;
  label?: string;
  text?: string;
  bbox?: BoundingBox;
  isProtected?: boolean;
  referenceToken?: string;
};

export type SanitizedPage = {
  url: string;
  title?: string;
  elements: SanitizedPageElement[];
};

export type SanitizedField = {
  ref: string;
  type: string;
  target: string;
};

export type SanitizedButton = {
  text?: string;
  target: string;
};

export type SanitizedContext = {
  user_task?: string;
  task?: string;
  page?: SanitizedPage | unknown;
  fields?: SanitizedField[];
  button?: SanitizedButton;
  protectedElements?: ProtectedElement[];
  screenshot?: string;
};

export type AgentActionType =
  | "CLICK"
  | "SCROLL"
  | "SELECT"
  | "TYPE_REFERENCE"
  | "NAVIGATE"
  | "WAIT"
  | "TYPE";

export type AgentAction = {
  action: AgentActionType;
  target: string;
  reference?: string;
  value?: string;
};

export type StructuredActionResponse = {
  response_type: "action" | "data";
  actions?: AgentAction[];
  data?: Record<string, any>;
};

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "BLOCKED";

export type ValidationResult = {
  allowed: boolean;
  reason?: string;
  action?: AgentAction;
  sanitizedAction?: AgentAction;
  riskLevel?: RiskLevel;
  timestamp?: number;
};

/**
 * Security & Local Secret Store Schemas (Person 4 Scope)
 */
export type SecretCategory =
  | "EMAIL"
  | "PHONE"
  | "NAME"
  | "CARD"
  | "POLICY"
  | "ADDRESS"
  | "CUSTOM";

export interface EncryptedPayload {
  ciphertext: string; // Base64 encoded
  iv: string;         // Base64 encoded (12 bytes)
  salt?: string;      // Base64 encoded (16 bytes)
  tagLength?: number; // Tag length in bits (default 128)
  version: number;    // Crypto schema version (default 1)
}

export interface StoredSecretMetadata {
  id: string;
  domain: string;        // e.g. "claims.insurance.com" or "*" for global profile
  category: SecretCategory;
  label: string;         // Human-readable identifier e.g. "Ayush Personal Email"
  referenceKey: string;  // e.g. "EMAIL_1"
  createdAt: number;
  updatedAt: number;
  lastUsedAt?: number;
  isLocked?: boolean;    // Protected against automated modifications
}

export interface StoredSecretRecord extends StoredSecretMetadata {
  encryptedValue: EncryptedPayload;
}

export interface DecryptedSecret extends StoredSecretMetadata {
  value: string;
}

export interface CreateSecretInput {
  domain: string;
  category: SecretCategory;
  label: string;
  value: string;
  referenceKey?: string;
  isLocked?: boolean;
}

export interface ValidationContext {
  currentUrl: string;
  pageTitle?: string;
  domElements: DomElement[];
  perceptionElements?: (VisionElement | OcrElement | ProtectedElement)[];
  activeReferenceMap?: Record<string, { category: SecretCategory; domain: string }>;
  allowedDomains?: string[];
}
