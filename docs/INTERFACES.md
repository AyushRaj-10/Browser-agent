# Interfaces

The project is contract-first. A consumer should be able to develop against the contract using mocks before the producer is complete.

## Interface 1 — Perception

### Producer
P1 + P2

### Consumer
P3

### Contract

```typescript
type PerceptionResult = {
  pageUrl: string;
  timestamp: number;
  dom: DomElement[];
  vision: VisionElement[];
  ocr: OcrElement[];
};
```

---

## Interface 2 — Privacy

### Producer
P3

### Consumer
P5

### Contract

```typescript
type SanitizedContext = {
  task: string;
  page: SanitizedPage;
  protectedElements: ProtectedElement[];
  screenshot?: string;
};
```

---

## Interface 3 — Agent Action

### Producer
P5

### Consumer
P4/P6

### Contract

```typescript
type AgentAction = {
  action: "CLICK" | "SCROLL" | "TYPE" | "SELECT";
  target: string;
  value?: string;
};
```

---

## Interface 4 — Validation

### Producer
P4

### Consumer
Browser executor

```typescript
type ValidationResult = {
  allowed: boolean;
  reason?: string;
};
```

## Interface Rules

1. Interfaces are versioned deliberately.
2. Breaking changes require team agreement.
3. Producers must satisfy the contract.
4. Consumers must not depend on undocumented internal fields.
5. Mocks should use the same schema as real components.
