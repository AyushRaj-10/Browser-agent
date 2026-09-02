// Message contract shared across background / content / popup.

// Keep this in sync with the backend and privacy components during integration.

export type FieldType =
  | "text"
  | "password"
  | "email"
  | "tel"
  | "number"
  | "url"
  | "search"
  | "date"
  | "time"
  | "datetime-local"
  | "month"
  | "week"
  | "file"
  | "color"
  | "range"
  | "checkbox"
  | "radio"
  | "textarea"
  | "select"
  | "button"
  | "link"
  | "other";

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnalyzedField {
  // Identifier used by the browser-agent pipeline.
  id: string;

  // DOM information.
  tag: string;
  role: string | null;
  name: string | null;
  label: string | null;
  type: FieldType;

  // Human-readable information.
  text: string | null;
  placeholder: string | null;

  // Current element state.
  required: boolean;
  disabled: boolean;
  visible: boolean;
  checked: boolean | null;

  // Screen position for DOM ↔ vision alignment.
  bbox: BoundingBox;

  // Automatic privacy classification produced locally.
  //
  // If true, the field is automatically protected and the user
  // must not be allowed to disable that protection.
  sensitive: boolean;

  // Never contains the raw value of a field marked sensitive.
  sampleValue: string | null;
}

export interface PageAnalysis {
  url: string;
  title: string;
  fields: AnalyzedField[];
  analyzedAt: number;
}

// Additional fields that the user explicitly wants protected.
//
// These IDs supplement automatic protection. They never override it.
export type UserProtectedFieldIds = string[];

export interface AskAIRequest {
  type: "ASK_AI";
  task: string;

  // Optional user-selected protection preferences for this page.
  //
  // Automatic sensitive fields remain protected regardless of
  // whether their IDs appear here.
  userProtectedFieldIds?: UserProtectedFieldIds;
}

export interface AnalyzePageRequest {
  type: "ANALYZE_PAGE";
}

export interface AnalyzePageResponse {
  type: "ANALYZE_PAGE_RESULT";
  analysis: PageAnalysis;
}

export interface HighlightElementRequest {
  type: "HIGHLIGHT_ELEMENT";
  elementId: string;
}

export interface ClearHighlightRequest {
  type: "CLEAR_HIGHLIGHT";
}

export interface AskAIResult {
  type: "ASK_AI_RESULT";

  // Total number of effectively protected fields:
  // automatic protection + additional user protection.
  sensitiveItemsProtected: number;

  rawItemsSent: number;

  // DOM analysis generated locally by the extension.
  // Used by the popup to visualize what the browser agent detected.
  analysis: PageAnalysis | null;

  // User-selected protection state that was applied to this request.
  userProtectedFieldIds: UserProtectedFieldIds;

  serverInstruction: string | null;

  error?: string;
}

export interface ExecuteActionRequest {
  type: "EXECUTE_ACTION";
  action: "CLICK" | "SCROLL" | "TYPE" | "SELECT" | "WAIT";
  target: string;
  value?: string;
}

export interface ExecuteActionResponse {
  type: "EXECUTE_ACTION_RESULT";
  success: boolean;
  action: string;
  target: string;
  error?: string;
}

export type ExtensionMessage =
  | AskAIRequest
  | AnalyzePageRequest
  | AnalyzePageResponse
  | HighlightElementRequest
  | ClearHighlightRequest
  | ExecuteActionRequest
  | ExecuteActionResponse
  | AskAIResult;