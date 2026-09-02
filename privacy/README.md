# Person 3 — Privacy Engine, Part 3: Sensitivity Classification + Redaction

This package now covers **Part 2 detection + Part 3 privacy treatment**. Part 1 (merging DOM/OCR/Vision into `UnifiedElement[]`) remains external. Part 2 uses deterministic rules plus optional browser-side Transformers.js NER. Part 3 classifies sensitivity and sanitizes into the final `SanitizedContext` that P5 is allowed to send off-device.

## What this module does

```text
UnifiedElement[]
      ↓
regex rules + optional Transformers.js NER
      ↓
CandidateDetection[]
      ↓
   classifySensitivity()      → SAFE | SENSITIVE | HIGHLY_SENSITIVE
            ↓
   decideAction()             → KEEP | MASK | REPLACE | BLOCK
            ↓
   buildTreatment()           → reference token (EMAIL_1) or masked value (**** 1234)
            ↓
   sanitize()                 → SanitizedContext { task, page, protectedElements, screenshot? }
```

## Why classification and redaction are separate steps

`docs/MODEL_SPEC.md §6` explicitly calls these different problems: *how
sensitive is this* vs. *what do we do about it*. Keeping them as two pure
functions (`classifySensitivity`, `decideAction`) means each can be unit
tested and reasoned about independently — which matters directly for the
SIH scoring, since PII precision/recall and redaction correctness are 40%
of the grade.

## Key design decisions

- **Treatment is keyed by TYPE first, sensitivity second.** Two
  `HIGHLY_SENSITIVE` things don't deserve the same treatment: a password is
  `BLOCK`ed outright (it's never derived from the page anyway — P4's local
  secret store supplies it at execution time), while a credit card is
  `MASK`ed to its last 4 digits so the agent can still confirm "yes, this is
  the right card" without ever seeing the full number.
- **Fail closed (D010).** Any detection below the confidence threshold, or
  any error during classification/redaction, escalates toward `BLOCK` —
  never silently downgrades to `SAFE`/`KEEP`. A privacy engine that fails
  open is worse than one that's occasionally overcautious.
- **Most-restrictive-wins per element.** If one on-screen field triggers
  multiple detections (e.g. free text that's both a `PERSON` name and
  contains an `EMAIL`), the element is rendered using whichever treatment is
  most restrictive, not whichever detector ran last.
- **`BLOCK` means truly gone**, not just "value removed." The label is
  stripped too, so a blocked password field doesn't even leak the fact that
  it's a password field via its label text — only its structural presence
  (needed for P5 to know a field exists to fill).
- **Screenshot forwarding is opt-in and conditional.** Per `docs/PRIVACY.md`,
  raw screenshots default to local-only. `sanitize()` will only forward one
  if explicitly passed in *and* nothing detected on it required `BLOCK`.

## Usage

```typescript
import { sanitize } from "@browser-agent/privacy";

const sanitizedContext = sanitize({
  task: "Fill out and submit the profile form",
  pageUrl: unifiedPerception.pageUrl,
  elements: unifiedElements,      // from Part 1 (merge layer)
  detections: candidateDetections // from Part 2 (regex + ML detection)
});

// sanitizedContext is now safe to hand to P5's backend adapter.
```

### Mock-first development (P5/P6 don't have to wait on Part 1/2)

```typescript
import { createMockSanitizedContext } from "@browser-agent/privacy";

const mock = createMockSanitizedContext();
// Use this to build/test the backend endpoint before real detection exists.
```

## Directory structure

```text
privacy/
├── src/
│   ├── types.ts        # UnifiedElement / CandidateDetection contracts (input to this module)
│   ├── classifier.ts    # classifySensitivity()
│   ├── redaction.ts      # decideAction(), maskValue(), ReferenceTokenGenerator, buildTreatment()
│   ├── sanitize.ts       # sanitize() — the public entry point, builds SanitizedContext
│   ├── mock.ts           # mock elements/detections/context for P5/P6
│   └── index.ts          # public exports
├── test/
│   ├── classifier.test.ts
│   ├── redaction.test.ts
│   └── sanitize.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Running tests

```bash
cd privacy
npm install
npm test
npm run typecheck
```

## Explicitly out of scope here

- Merging DOM/OCR/Vision into `UnifiedElement[]` (Part 1).
- Calling the VLM/LLM directly — per `docs/COMPONENT_OWNERSHIP.md`, the
  Privacy Engine must never do this; it only ever hands `SanitizedContext`
  to P5.
