/**
 * Canonical Types for Privacy-Preserving Browser Agent
 * Conforms to docs/DATA_SCHEMAS.md and docs/INTERFACES.md
 */

export type BoundingBox = [number, number, number, number]; // [x, y, width, height]

export type DomElement = {
  id: string;
  tag: string;
  role?: string;
  type?: string;
  label?: string;
  text?: string;
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
};

export type PerceptionResult = {
  pageUrl: string;
  timestamp: number;
  dom: DomElement[];
  vision: VisionElement[];
  ocr: OcrElement[];
};

export type SanitizedPage = {
  url: string;
  title?: string;
  elements: Array<{
    id: string;
    type: string;
    label?: string;
    text?: string;
    bbox?: BoundingBox;
    isProtected?: boolean;
    referenceToken?: string;
  }>;
};

export type SanitizedContext = {
  task: string;
  page: SanitizedPage | unknown;
  protectedElements: ProtectedElement[];
  screenshot?: string;
};

export type AgentActionType = "CLICK" | "SCROLL" | "TYPE" | "SELECT";

export type AgentAction = {
  action: AgentActionType;
  target: string;
  value?: string;
};

export type ValidationResult = {
  allowed: boolean;
  reason?: string;
};
