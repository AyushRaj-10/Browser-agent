# Data Schemas

These are canonical shapes. Internal implementation can change without changing the contract.

## DomElement

```typescript
type DomElement = {
  id: string;
  tag: string;
  role?: string;
  type?: string;
  label?: string;
  text?: string;
  bbox?: [number, number, number, number];
};
```

## VisionElement

```typescript
type VisionElement = {
  id: string;
  type: string;
  bbox: [number, number, number, number];
  confidence: number;
};
```

## OcrElement

```typescript
type OcrElement = {
  id: string;
  text: string;
  bbox: [number, number, number, number];
  confidence: number;
};
```

## ProtectedElement

```typescript
type ProtectedElement = {
  id: string;
  type:
    | "EMAIL"
    | "PHONE"
    | "PASSWORD"
    | "PERSON"
    | "CREDIT_CARD"
    | "FACE"
    | "OTHER";
  source: "DOM" | "OCR" | "VISION";
  confidence: number;
  bbox?: [number, number, number, number];
  sensitivity: "SAFE" | "SENSITIVE" | "HIGHLY_SENSITIVE";
  action: "KEEP" | "MASK" | "REPLACE" | "BLOCK";
};
```

## PerceptionResult

```typescript
type PerceptionResult = {
  pageUrl: string;
  timestamp: number;
  dom: DomElement[];
  vision: VisionElement[];
  ocr: OcrElement[];
};
```

## SanitizedContext

```typescript
type SanitizedContext = {
  task: string;
  page: unknown;
  protectedElements: ProtectedElement[];
  screenshot?: string;
};
```

## AgentAction

```typescript
type AgentAction = {
  action: "CLICK" | "SCROLL" | "TYPE" | "SELECT";
  target: string;
  value?: string;
};
```

## ValidationResult

```typescript
type ValidationResult = {
  allowed: boolean;
  reason?: string;
};
```
