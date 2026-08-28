

# ============================================================
# FILE: API_SPEC.md
# ============================================================

# API Specification

## Purpose

Provide a minimal interface between the browser extension and the remote reasoning backend.

## Endpoint

`POST /agent/context`

## Request

```json
{
  "task": "Submit the insurance application",
  "context": {
    "page": {},
    "elements": [],
    "visual": {}
  }
}
```

The `context` object must already have passed through the local privacy engine.

## Response

```json
{
  "action": {
    "action": "CLICK",
    "target": "submit_button"
  }
}
```

## Supported Actions

```text
CLICK
SCROLL
TYPE
SELECT
```

## Validation

The backend must validate:

- request structure;
- required fields;
- action schema;
- allowed action names.

The client must perform its own action validation before execution.

## Authentication

Authentication is separate from privacy.

A token such as JWT may answer:

> Who is making this request?

It does not answer:

> Is the request allowed to contain this data?

## Errors

```json
{
  "error": {
    "code": "INVALID_CONTEXT",
    "message": "Context validation failed"
  }
}
```

Suggested codes:

```text
INVALID_REQUEST
INVALID_CONTEXT
UNAUTHORIZED
RATE_LIMITED
MODEL_FAILURE
MODEL_TIMEOUT
INTERNAL_ERROR
```

## Data Rule

The endpoint must not be used as a place to perform first-pass privacy filtering. Protected context should already be sanitized by the client.


# ============================================================
# FILE: ARCHITECTURE.md
# ============================================================

# Architecture

## Simple Architecture

```text
USER
  ↓
BROWSER
  ↓
LOCAL PERCEPTION
  ↓
PRIVACY ENGINE
  ↓
SANITIZED CONTEXT
  ↓
SERVER / VLM
  ↓
STRUCTURED ACTION
  ↓
LOCAL VALIDATOR
  ↓
BROWSER
```

## Detailed Architecture

```text
                         USER
                           │
                           ▼
                        BROWSER
                           │
                           ▼
                 ┌──────────────────┐
                 │ Browser Extension│
                 └────────┬─────────┘
                          │
               ┌──────────┴──────────┐
               │                     │
               ▼                     ▼
              DOM                Screenshot
               │                     │
               │                Local Vision
               │                     │
               │                    OCR
               │                     │
               └──────────┬──────────┘
                          ▼
                Unified Screen Model
                          │
                          ▼
                  Privacy Engine
                          │
                    Safe Context
                          │
                    ──────┼──────
                     PRIVACY WALL
                    ──────┼──────
                          │
                          ▼
                    Backend / VLM
                          │
                    Structured Action
                          │
                          ▼
                  Local Action Validator
                          │
                          ▼
                       BROWSER
```

## Architectural Principles

1. Privacy processing happens locally before agent context crosses the client/server boundary.
2. DOM, OCR, and vision are perception sources, not separate end-to-end systems.
3. The remote model receives only the sanitized representation approved by the privacy layer.
4. The remote model returns a structured action.
5. The local browser remains responsible for final action validation and execution.
6. Expensive local inference should be triggered when useful rather than continuously.
7. The architecture should remain a small number of clear components rather than many microservices.

## Component Summary

| Component | Purpose |
|---|---|
| Browser Extension | Orchestrates user interaction and browser integration |
| DOM Analyzer | Reads structured page information |
| Screenshot Collector | Captures visual context |
| Local Vision | Understands visual elements |
| OCR | Extracts text from visual content |
| Unified Representation | Merges perception sources |
| Privacy Engine | Detects and sanitizes sensitive information |
| Backend | Receives sanitized context and coordinates remote reasoning |
| VLM/LLM | Performs heavier reasoning |
| Action Validator | Checks returned actions locally |
| Browser Executor | Performs approved actions |


# ============================================================
# FILE: ASSUMPTIONS.md
# ============================================================

# Assumptions

| Assumption | Why | Risk if wrong | Verification |
|---|---|---|---|
| Browser extension can access required page information | Core architecture | Required capability unavailable | Browser prototype |
| Local visual inference is feasible | Core problem requirement | Client resource/latency failure | Local benchmark |
| DOM complements vision | Structured page information is useful | Redundant processing | Perception evaluation |
| OCR helps with visually rendered text | Some text may exist outside useful DOM structure | Added latency | Benchmark |
| Sanitized context can be sufficient for selected tasks | Hybrid architecture depends on it | Task failure | E2E test |
| Structured actions cover the initial demo | Keeps execution bounded | Some tasks unsupported | Demo validation |
| Chrome and Firefox can share most core logic | WebExtension approach | Browser-specific issues | Cross-browser test |
| Remote model can reason over sanitized context | Core cloud reasoning idea | Low task success | E2E evaluation |
| Privacy categories can be defined for V1 | Needed for deterministic evaluation | Scope ambiguity | Team decision |
| The selected remote model is compliant with competition rules | Required for final demo | Compliance risk | Verify with organizers/rules |


# ============================================================
# FILE: BOUNDARIES.md
# ============================================================

# Allowed / Not Allowed / Out of Scope

## ALLOWED

- Browser extensions.
- Local DOM analysis.
- Local screenshots.
- Local OCR.
- Local computer vision.
- WebGPU/WebAssembly/browser inference runtimes.
- Local PII detection.
- Local redaction.
- Sanitized network transmission.
- Server-side LLM/VLM reasoning.
- Existing pretrained models.
- Structured browser actions.
- Local action validation.
- Cloud-hosted reasoning where permitted by the competition rules.

## NOT ALLOWED

- Raw sensitive context being intentionally sent to the remote reasoning service in the protected flow.
- First-pass privacy filtering only after data reaches the server.
- Logging unnecessary sensitive values.
- Blind arbitrary-code execution from model output.
- Bypassing browser permission boundaries.
- Treating TLS as a substitute for privacy filtering.

## OUT OF SCOPE

- Building a new browser.
- Training a foundation model.
- Blockchain.
- Federated learning.
- Massive microservice infrastructure.
- Full password-manager replacement.
- OS-wide surveillance.
- Solving every possible browser security vulnerability.
- Guaranteeing perfect PII detection for every possible data type.


# ============================================================
# FILE: COMPETITIVE_EDGE.md
# ============================================================

# Competitive Edge

## What Typical Teams May Build

A likely approach is:

```text
Screenshot
 ↓
PII detector
 ↓
Mask PII
 ↓
Cloud VLM
 ↓
Browser action
```

This is valid but easy to understand and easy to reproduce.

## What We Want to Build

```text
DOM + Screenshot + OCR/Vision
          ↓
   Unified screen understanding
          ↓
      Privacy reasoning
          ↓
  Reveal only useful/safe context
          ↓
       Remote reasoning
          ↓
      Local validation
          ↓
          Browser
```

## X-Factor

**Task-aware minimum disclosure.**

The system should eventually ask:

> What does the remote model actually need to know for this task?

rather than only:

> What should be hidden?

## Why It Matters

For a task such as:

```text
"Click Submit"
```

the model may only need:

```text
Submit button exists
Position
Enabled state
```

It may not need:

```text
Name
Email
Phone
Password
```

## What We Must Prove

The strongest competitive claim is not “we use a vision model” or “we hide PII.”

It is:

> **We can reduce unnecessary information exposed to the remote agent while preserving useful task performance.**

## Proof

Show the judge:

```text
What exists locally
       ↓
What was detected
       ↓
What was protected
       ↓
What actually left the device
       ↓
What the remote AI decided
       ↓
What the browser executed
```

## Do Not Compete On

- biggest model;
- most infrastructure;
- most browser commands;
- biggest UI;
- artificial architectural complexity.

## Strategic Wedge

Become the team that makes **privacy-preserving information flow** the visible center of the browser-agent problem.

## Research Direction

Measure the privacy–task-success tradeoff rather than claiming that the underlying idea of local redaction is itself new.


# ============================================================
# FILE: COMPONENT_OWNERSHIP.md
# ============================================================

# Component Ownership

| Component | Owner | Responsibility | Input | Output | Dependencies | Must NOT do |
|---|---|---|---|---|---|---|
| Extension shell | P1 | Extension lifecycle and messaging | Browser/task | Extension state | Browser APIs | Own ML logic |
| DOM analyzer | P1 | Extract structured page info | DOM | DOM elements | Browser | Own global privacy policy |
| Popup/UI | P1 | User interaction/status | Task/results | UI state | Extension | Implement VLM logic |
| Screenshot collector | P2 | Capture visual state | Browser tab | Image | Browser API | Send directly to server |
| Local vision | P2 | Visual detection | Image | Vision elements | Model/runtime | Decide global privacy policy |
| OCR | P2 | Extract visual text | Image | OCR elements | OCR runtime | Send raw output externally |
| Unified representation | P3 | Merge perception sources | DOM/OCR/vision | Common screen objects | P1/P2 contracts | Execute actions |
| Privacy engine | P3 | Detect/classify/sanitize | Unified objects | Sanitized context | Shared schema | Call model directly |
| Local secret store | P4 | Local protection of actual values | User values | Local references/values | Browser storage/crypto | Send actual secrets remotely |
| Action validator | P4 | Validate model actions | Action + page state | Allow/reject | Browser state | Trust model blindly |
| Backend API | P5 | Receive safe context | HTTP request | Model request/response | Shared schema | Accept raw sensitive context in normal protected flow |
| VLM/LLM adapter | P5 | Remote reasoning | Sanitized context | Agent action | Model provider | Execute browser directly |
| Integration | P6 | Connect components | All contracts | E2E pipeline | All workstreams | Silently redefine ownership |
| Evaluation | P6 | Measure performance | Test runs | Metrics/reports | Demo/test data | Modify production behavior |


# ============================================================
# FILE: DATABASE.md
# ============================================================

# Database Plan

## V1 Decision

A persistent database is **not required for the core prototype**.

The core system can operate with:

- temporary browser state;
- temporary backend request state;
- local secure storage if secret handling is implemented;
- files/artifacts for evaluation results.

## Why

The project is primarily about:

```text
local perception
→ privacy protection
→ sanitized reasoning
→ browser action
```

A database does not directly solve any of those core requirements.

## Possible Future Persistent Data

If persistence becomes necessary, it may include:

```text
User
Task
EvaluationRun
MetricResult
```

but these should be introduced only when there is a concrete requirement.

## Source of Truth

- Current webpage: browser state.
- Sensitive-data decision: local privacy engine.
- Actual secrets: local secure store if implemented.
- Remote reasoning result: server response for that request.
- Final browser state: browser itself.
- Evaluation metrics: evaluation artifacts.


# ============================================================
# FILE: DATA_CLASSIFICATION.md
# ============================================================

# Data Classification

| Data type | Sensitivity | Required? | Stored? | External transmission? | Access |
|---|---|---:|---:|---:|---|
| User task | Low/medium | Yes | Temporary | If needed for remote reasoning | Extension + backend |
| Raw DOM | Potentially high | Yes | Temporary | No raw transmission | Local |
| Raw screenshot | Potentially high | Yes | Temporary | No raw transmission in protected flow | Local |
| OCR text | Context-dependent | Conditional | Temporary | Sanitized only | Local |
| Vision detections | Context-dependent | Yes | Temporary | Sanitized derivative | Local/server |
| Email | Sensitive | Conditional | Prefer local/reference | Prefer not raw | Local |
| Phone | Sensitive | Conditional | Prefer local/reference | Prefer not raw | Local |
| Password | Highly sensitive | Conditional | Local only | No | Local |
| OTP | Highly sensitive | Conditional | Local only | No | Local |
| Face | Sensitive | Conditional | Temporary | Anonymized derivative only | Local |
| Sanitized context | Reduced sensitivity | Yes when cloud used | Temporary | Yes | Local + server |
| Model output | Usually low | Yes | Temporary | Yes | Server + client |
| Action | Usually low | Yes | Temporary | Yes | Client |
| Metrics | Usually low | Yes for evaluation | Yes | Controlled | Team |
| Logs | Variable | Operationally useful | Controlled | Avoid sensitive content | Restricted |

## Core Rule

> A data item is not safe merely because it is encrypted in transit. The system must decide whether the item should be transmitted at all, before it becomes part of the outgoing agent request.


# ============================================================
# FILE: DATA_FLOW.md
# ============================================================

# Data Flow

## Complete Lifecycle

```text
USER
 ↓
TASK
 ↓
BROWSER PAGE
 ↓
LOCAL OBSERVATION
 ↓
LOCAL PERCEPTION
 ↓
UNIFIED SCREEN REPRESENTATION
 ↓
PRIVACY ANALYSIS
 ↓
SANITIZATION
 ↓
SAFE CONTEXT
 ↓
SERVER / VLM
 ↓
STRUCTURED ACTION
 ↓
LOCAL ACTION VALIDATION
 ↓
BROWSER EXECUTION
 ↓
USER RESULT
```

## Stage Table

| Stage | Input | Output | Owner | Storage | Transmission | Security | Failure behavior |
|---|---|---|---|---|---|---|---|
| User task | User instruction | Task string/object | P1 | Temporary | If remote reasoning needs it | Avoid unnecessary sensitive detail | Reject invalid task |
| Browser observation | Current page | DOM + screenshot | P1/P2 | Temporary | None initially | Local only | Use available source or stop |
| Perception | DOM/image | DOM/OCR/vision detections | P1/P2 | Temporary | No raw output directly | Local processing | Report detector failure |
| Unified representation | Perception outputs | Common screen objects | P3 | Temporary | Not yet | Local | Invalid records rejected |
| Privacy analysis | Unified objects | Sensitivity + treatment | P3 | Temporary | No raw protected output | Local policy | Fail closed if unavailable |
| Sanitization | Raw local representation | Safe context | P3 | Temporary | Ready for request | Only approved context | Do not send if uncertain |
| Remote reasoning | Safe context | Structured action | P5 | Temporary | HTTPS/API | Server validates schema | Retry/stop |
| Validation | Action + current page | Allow/reject | P4 | Temporary | None | Local | Reject invalid/unsafe action |
| Execution | Validated action | Browser state change | P4/P6 | None or temporary | None | Browser permissions | Stop on execution error |
| Result | Final browser state | User-visible result | P1/P6 | Optional | Optional metrics only | Avoid sensitive logs | Show task failure |

## Network Rule

The relevant application data flow is:

```text
Raw local page information
        ↓
Local privacy processing
        ↓
Sanitized request data
        ↓
HTTP request
        ↓
TLS
        ↓
Network
        ↓
Server
```

The privacy layer does not sit between the TLS handshake and encrypted packets. It operates before the sensitive values are included in the outgoing agent request.


# ============================================================
# FILE: DATA_LINEAGE.md
# ============================================================

# Data Lineage

| Data | Created by | Consumed by | Modified by | Stored where | Transmitted where | Deleted when |
|---|---|---|---|---|---|---|
| User task | User/extension | Agent pipeline | Context formatter | Temporary client state | Backend if remote reasoning | After task/request |
| Raw DOM | Browser/extension | DOM analyzer | Privacy sanitization | Temporary client memory | Not in raw form | After processing |
| Raw screenshot | Extension | Vision/OCR | Redaction pipeline | Temporary client memory | Not in raw form | After processing |
| OCR output | OCR module | Unified representation | Privacy engine | Temporary client memory | Sanitized derivative only | After task |
| Vision detections | Vision module | Unified representation | Privacy engine | Temporary client memory | Sanitized derivative only | After task |
| Protected-element records | Privacy engine | Redaction/context builder | Policy processing | Temporary client memory | Sanitized derivative only | After task |
| Sanitized context | Privacy engine | Backend | Request formatter | Temporary | Server | After request/task |
| Model output | VLM/LLM | Validator | Schema validation | Temporary | Browser client | After action |
| Agent action | VLM/LLM | Action validator | Validator | Temporary | Browser | After execution |
| Actual secret value | Local secret layer if used | Local executor | Local resolution | Local secure storage | Should remain local | User/policy controlled |
| Secret reference | Local secret layer | Server/action flow if needed | None | Temporary/local | Reference only if design permits | After task |
| Metrics | Evaluation system | Evaluation/reporting | Aggregator | Evaluation storage | Controlled | Per project policy |
| Logs | Components | Developers | Logging layer | Controlled | Avoid sensitive content | Per logging policy |


# ============================================================
# FILE: DATA_SCHEMAS.md
# ============================================================

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


# ============================================================
# FILE: EVALUATION.md
# ============================================================

# Evaluation

## Core Claims

### Claim 1
The local system can understand useful visual information.

Measure visual-context accuracy.

### Claim 2
The privacy engine can identify sensitive information.

Measure PII precision and recall.

### Claim 3
The privacy engine can protect sensitive regions accurately.

Measure redaction precision and, where appropriate, bounding-box IoU.

### Claim 4
Local processing is practical.

Measure CPU, RAM, GPU usage, and local inference time.

### Claim 5
The hybrid system can complete useful browser tasks.

Measure task success and end-to-end latency.

## SIH Metrics

| Metric | Weight |
|---|---:|
| Visual context accuracy | 25% |
| PII precision/recall | 20% |
| Redaction precision | 20% |
| Client resource utilization | 20% |
| End-to-end latency | 15% |

## Baselines

### Baseline A — Full Context

Raw permitted context → remote VLM/LLM → action.

### Baseline B — Basic Redaction

Raw context → simple PII masking → remote VLM/LLM → action.

### Proposed System

Local DOM + OCR + vision → unified representation → privacy engine → sanitized context → remote reasoning → local action validation.

## Research Extension

A secondary experiment can compare information disclosure levels:

```text
Full context
     vs
Basic redaction
     vs
Minimum useful context
```

and measure the tradeoff between:

- information exposed;
- task success;
- latency;
- payload size.

## Important Evaluation Rule

Do not claim privacy because the dashboard says privacy was achieved. Inspect the actual outgoing agent payload and compare it with the sensitive information intentionally placed on the test page.

## Stress Tests

Test:

- dense forms;
- sensitive data inside images;
- visually complex pages;
- multiple PII elements;
- missing/ambiguous labels;
- changing page states;
- false-positive-prone text;
- low-confidence detections.


# ============================================================
# FILE: FAILURE_MODES.md
# ============================================================

# Failure Modes

All critical failures follow:

```text
Failure
 ↓
Detection
 ↓
Response
 ↓
Recovery
 ↓
Safe final state
```

## Invalid User Task

- Detect: validation.
- Response: reject.
- Recovery: ask for a valid task.

## Screenshot Failure

- Detect: capture error.
- Response: use another available perception source if safe.
- Recovery: retry or stop.

## Vision Model Failure

- Detect: inference error/timeout.
- Response: mark vision unavailable.
- Recovery: use safe fallback signals where appropriate.

## OCR Failure

- Detect: OCR error/timeout.
- Response: mark OCR unavailable.
- Recovery: continue with other perception sources if safe.

## Privacy Engine Failure

- Detect: engine exception or incomplete result.
- Response: do not transmit affected protected context.
- Recovery: retry locally.
- Safe state: fail closed.

## Backend Failure

- Detect: HTTP/API failure.
- Response: do not fabricate an action.
- Recovery: retry or report failure.

## VLM/LLM Failure

- Detect: timeout, malformed response, provider failure.
- Response: reject action.
- Recovery: retry or stop.

## Malformed Action

- Detect: schema validation failure.
- Response: reject.

## Incorrect Target

- Detect: local validator cannot match target to current state.
- Response: reject.

## Dangerous Action

- Detect: policy/validator rule.
- Response: reject or require user confirmation according to policy.

## Network Failure

- Detect: timeout/disconnect.
- Response: do not execute an imaginary action.

## Browser Permission Failure

- Detect: browser API permission error.
- Response: do not bypass it.

## Unexpected Page Change

- Detect: current page/state no longer matches action context.
- Response: invalidate the action and re-observe if appropriate.


# ============================================================
# FILE: INTERFACES.md
# ============================================================

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


# ============================================================
# FILE: MODEL_SPEC.md
# ============================================================

# Model and Algorithm Specification

## 1. Local Vision

### Purpose

Understand visual elements that are not reliably represented by the DOM alone.

### Input

Screenshot/image.

### Output

Visual detections with type, bounding box, and confidence.

### Execution

Possible browser runtimes include WebGPU and WebAssembly through a browser-compatible inference runtime such as ONNX Runtime Web. The exact model must be selected and documented before implementation is frozen.

---

## 2. OCR

### Purpose

Extract text that appears visually.

### Input

Screenshot or image region.

### Output

Text, bounding boxes, and confidence.

---

## 3. PII/Sensitivity Detection

Use a hybrid strategy:

```text
DOM signals
+
Rules / regex
+
OCR context
+
Vision detections
+
Optional ML context detection
```

Typical initial categories:

```text
EMAIL
PHONE
PASSWORD
PERSON
CREDIT_CARD
FACE
```

The exact V1 category list is an open project decision.

---

## 4. Privacy Treatment

Every protected element receives a treatment:

```text
KEEP
MASK
REPLACE
BLOCK
```

The treatment depends on sensitivity and usefulness of the context.

---

## 5. Remote VLM/LLM

### Purpose

Reason over sanitized context and generate a structured browser action.

### Input

```text
User task
+
Sanitized context
```

### Output

```text
AgentAction
```

The exact provider/model must comply with the competition rules.

---

## 6. Important Separation

The following are different problems:

```text
Vision
= What is visually present?

Privacy
= What is sensitive and how should it be protected?

Reasoning
= Given safe context, what should happen?

Execution
= Is the action valid and should it happen?
```


# ============================================================
# FILE: OPEN_QUESTIONS.md
# ============================================================

# Open Questions

## 🔴 Must Decide Before Serious Implementation

1. What exact sensitive-data categories are officially supported in V1?
2. What is the one primary end-to-end demonstration task?
3. Which remote VLM/LLM model/provider is permitted under the competition rules?
4. What minimum action set is required for the demonstration?
5. What is the target definition of acceptable task success?

## 🟠 Should Decide Early

1. Exact local vision model.
2. OCR choice.
3. Exact semantic placeholder format.
4. Exact unified representation fields.
5. Exact privacy treatments for each sensitive category.
6. Exact performance measurement method.
7. Exact Chrome/Firefox compatibility target.

## 🟡 Can Decide Later

1. Advanced minimum-disclosure logic.
2. Privacy modes.
3. Privacy budget.
4. Local secret-reference enhancements.
5. More advanced adaptive cloud usage.


# ============================================================
# FILE: PRIVACY.md
# ============================================================

# Privacy Specification

## Privacy Objective

Allow the remote AI to perform useful reasoning without unnecessarily exposing sensitive user information.

## Data Collection

Potentially collected locally:

- DOM information;
- screenshots;
- OCR output;
- vision detections;
- user task.

## Local-Only Data

Preferably kept local:

- raw screenshots;
- raw DOM values containing sensitive information;
- raw OCR containing PII;
- passwords;
- OTPs;
- authentication secrets;
- private keys;
- actual secret values.

## Remotely Permitted Data

Only context that has passed the local privacy policy.

Example:

```text
Local:
Email: ayush@gmail.com

Remote:
Email: <EMAIL>
```

## Sensitive Data Treatment

Potential treatments:

```text
KEEP
MASK
REPLACE
BLOCK
```

## Semantic Protection

When possible, preserve meaning without preserving the actual value.

Example:

```text
ayush@gmail.com
        ↓
<EMAIL>
```

## Privacy Boundary

```text
ORIGINAL DATA
     ↓
LOCAL PRIVACY PROCESSING
     ↓
SANITIZED DATA
     ↓
NETWORK
```

## User Experience

Privacy protection should mostly be invisible during normal browsing. When the agent is active, the user may be shown a protection status or privacy receipt.

## Privacy Verification

The strongest evidence is inspection of the actual outgoing agent payload, not merely a dashboard claim.


# ============================================================
# FILE: PROJECT_OVERVIEW.md
# ============================================================

# Project Overview — Privacy-Preserving Browser Vision Agent

## 1. Problem

AI browser agents need to understand webpages and screen states to help users complete tasks such as filling forms, navigating dashboards, scrolling, and clicking buttons. The screen may contain sensitive information such as passwords, email addresses, phone numbers, faces, government identifiers, or private documents.

Sending raw visual/page context to a remote AI can expose information the AI does not need.

## 2. Why This Problem Matters

A local device has direct access to the user's browser and private information, but usually has fewer resources than a server. A server can run more capable reasoning models, but requires data to cross a network boundary.

The project therefore explores a hybrid model:

- Local side: perception and privacy protection.
- Remote side: heavier reasoning when required.
- Local side: final validation and browser execution.

## 3. Goal

Build a browser-based AI agent that can understand a user's webpage, protect sensitive information locally before transmission, use remote reasoning on sanitized context, and safely execute the resulting browser action.

## 4. Proposed Solution

```text
User Task
   ↓
Browser
   ↓
Local Perception
(DOM + Screenshot + OCR + Vision)
   ↓
Unified Screen Representation
   ↓
Privacy Engine
   ↓
Sanitized Context
   ↓
Server / VLM or LLM
   ↓
Structured Action
   ↓
Local Action Validation
   ↓
Browser Execution
```

## 5. Target User

A user who wants AI assistance inside a browser but does not want unnecessary private screen information exposed to remote AI systems.

## 6. Core Workflow

1. User gives an instruction.
2. Extension observes the current webpage locally.
3. DOM, local vision, and optional OCR provide perception signals.
4. The signals are merged into a unified representation.
5. The local privacy engine identifies sensitive information.
6. Sensitive information is masked, replaced, or blocked according to policy.
7. Only sanitized context may be sent to the remote reasoning system.
8. The remote model returns a structured action.
9. The local browser validates the action.
10. The browser executes the approved action.

## 7. X-Factor

The strongest potential differentiator is **task-aware minimum disclosure**:

> Do not only ask what information is sensitive; ask what information the remote AI actually needs for the task.

This is a research/differentiation direction. It should not block the minimum working system.

## 8. Non-Goals

The project does not aim to:

- build a new browser;
- train a foundation model;
- build blockchain or federated-learning infrastructure;
- create a large microservice platform;
- replace password managers;
- provide unrestricted arbitrary-code execution to the model;
- solve every browser-security problem;
- guarantee perfect detection of every possible sensitive datum.

## 9. Constraints

- Sensitive information must be protected before the relevant data is transmitted.
- A genuine local visual-processing component must be present.
- Client-side resource usage matters.
- Visual accuracy, PII detection, redaction, resource usage, and latency matter.
- The final target should support Chrome and Firefox.
- Remote model selection must follow the applicable SIH rules.

## 10. Success Criteria

The system should demonstrate:

- useful visual understanding;
- measurable PII precision and recall;
- accurate redaction;
- no unintended raw sensitive information in the agent's remote payload;
- successful remote reasoning on sanitized context;
- safe browser execution;
- acceptable CPU/RAM/GPU usage;
- acceptable end-to-end latency;
- a complete end-to-end task.

## SIH Evaluation Weights

| Metric | Weight |
|---|---:|
| Accuracy of visual context from screen | 25% |
| Precision and recall for sensitive/PII detection | 20% |
| Precision of redaction | 20% |
| Client-side resource utilization | 20% |
| Overall end-to-end latency | 15% |


# ============================================================
# FILE: REQUIREMENTS.md
# ============================================================

# Requirements

## Functional Requirements

| ID | Requirement | Description |
|---|---|---|
| FR-01 | User task | Accept a user instruction for browser assistance. |
| FR-02 | Browser extension | Operate as a client-side browser extension/JS component. |
| FR-03 | Local observation | Observe relevant webpage/screen state locally. |
| FR-04 | Local visual processing | Run lightweight computer-vision processing locally. |
| FR-05 | Sensitive-data detection | Detect sensitive or personal information. |
| FR-06 | Pre-transmission sanitization | Sanitize sensitive information before the corresponding agent context is transmitted. |
| FR-07 | Sanitized transmission | Permit only sanitized/allowed context to reach the remote reasoning system. |
| FR-08 | Remote reasoning | Use an LLM/VLM for heavier reasoning when needed by the selected architecture. |
| FR-09 | Action generation | Produce structured browser actions. |
| FR-10 | Local action validation | Validate model-generated actions against current browser state. |
| FR-11 | Browser execution | Execute approved actions locally. |
| FR-12 | End-to-end task | Demonstrate a complete task from user instruction to browser result. |
| FR-13 | Browser target | Target Chrome and Firefox for the final client. |

## Non-Functional Requirements

- Privacy: sensitive information must be protected before transmission.
- Accuracy: visual/page understanding must be measurable.
- Detection quality: PII precision and recall must be measurable.
- Redaction precision: protected regions should be accurate.
- Resource efficiency: client CPU/RAM/GPU usage must be measured.
- Latency: end-to-end task latency must be measured.
- Reliability: component failures must result in safe behavior.
- Security: model output must not automatically gain unrestricted browser control.

## Research Requirements

- Define a baseline.
- Define a test set and ground truth.
- Measure visual-context accuracy.
- Measure PII precision/recall.
- Measure redaction precision.
- Measure client resource usage.
- Measure end-to-end latency.
- Measure task success.
- Evaluate the proposed privacy approach against meaningful alternatives.


# ============================================================
# FILE: SECURITY.md
# ============================================================

# Security Specification

## Threat Model

We assume that webpage content, remote model output, and external network content may be untrusted.

## Trusted Local Controls

- Browser extension's privacy engine.
- Local secret store, if used.
- Local action validator.
- Current browser state.

## Potentially Untrusted

- Website content.
- Webpage instructions.
- Remote model output.
- External services.
- Remote network content.

## Attacker CAN Potentially

- Display misleading content.
- Place prompt-injection instructions on a page.
- Put sensitive information into images.
- Cause the UI to change unexpectedly.
- Return or induce malformed external responses.

## Attacker MUST NOT Be Allowed To

- Override local privacy decisions.
- Read local secret values directly through the agent flow.
- Force raw sensitive context across the privacy boundary.
- Execute arbitrary model-generated browser code.
- Bypass action validation.

## Action Security

The remote model should return a constrained action language:

```text
CLICK
SCROLL
TYPE
SELECT
```

The local validator checks the action against current browser state before execution.

## Fail-Closed Rule

If a required privacy step fails, the system should not transmit the affected protected context.

## Logging

Do not log:

- passwords;
- authentication tokens;
- private keys;
- raw sensitive screenshots;
- unnecessary raw PII.

Prefer safe operational logs such as:

```text
PII detected: 4
Raw sensitive values transmitted: 0
Action: CLICK
Latency: 780 ms
```


# ============================================================
# FILE: SYSTEM_BOUNDARIES.md
# ============================================================

# System Boundaries

## Inside Our System

- Browser extension
- DOM analysis
- Screenshot capture
- Local vision
- OCR
- Unified screen representation
- Privacy engine
- Local secret handling, if used
- Action validation
- Browser executor
- Backend API
- VLM/LLM adapter
- Evaluation tooling

## Outside Our System

- Webpages and third-party websites
- Browser engine internals
- Internet infrastructure
- External AI model providers
- Third-party APIs

## Main Boundary

```text
┌──────────────────────────────────────┐
│          TRUSTED LOCAL SIDE          │
│                                      │
│ Browser                              │
│ Extension                            │
│ DOM / Screenshot                     │
│ Vision / OCR                         │
│ Privacy Engine                       │
│ Local Secrets                        │
│ Action Validator                     │
└──────────────────┬───────────────────┘
                   │
             SAFE CONTEXT ONLY
                   │
             ══════╪══════
              PRIVACY WALL
             ══════╪══════
                   │
┌──────────────────▼───────────────────┐
│       REMOTE / EXTERNAL SIDE         │
│                                      │
│ Backend                              │
│ VLM / LLM                            │
│ External services                    │
└──────────────────────────────────────┘
```

## Boundary Rules

1. Raw protected context must not cross the client/server boundary.
2. The server cannot override a local privacy decision.
3. Website content is treated as untrusted input to the agent.
4. Remote model output is treated as untrusted until validated locally.
5. External service failures must not cause the browser to execute an invented action.


# ============================================================
# FILE: TEAM_MENTAL_MODEL.md
# ============================================================

# Team Mental Model

These statements are the shared truths of the project. Individual implementations may differ, but these statements must not.

1. The project is a browser AI agent with a local privacy layer.
2. The browser/client is the first place where privacy can be enforced because it sees the original page.
3. Local perception may use DOM, screenshots, OCR, and local vision.
4. Local vision is a real part of the solution, not a decorative feature.
5. DOM is complementary to vision; it is not a replacement for visual understanding.
6. DOM, OCR, and vision detections must eventually enter one unified representation.
7. The Privacy Engine owns the decision about how sensitive information is treated.
8. Raw sensitive information must not cross the client-to-server privacy boundary.
9. Sanitized context may cross that boundary when remote reasoning is needed.
10. The remote model reasons about sanitized context; it does not own the user's raw secrets.
11. The remote model returns structured actions, not unrestricted browser code.
12. The local browser validates the action before execution.
13. Current browser state is authoritative over model assumptions.
14. If required privacy processing fails, protected context must not be transmitted.
15. Normal browsing should remain normal; privacy protection should mostly be invisible to the user.
16. The team optimizes for the SIH evaluation criteria, not feature count.
17. A feature is not part of the project merely because it is technically interesting.
18. Every component has one primary owner.
19. Interfaces are shared; internal implementations are owned by the relevant person.
20. Mocks and contracts exist so people can work independently.


# ============================================================
# FILE: TESTING.md
# ============================================================

# Testing Strategy

## Unit Tests

Each owner tests their own component using fixed inputs and expected outputs.

Examples:

- DOM parser extracts expected fields.
- Vision parser returns valid detections.
- OCR parser returns valid text boxes.
- PII detector labels known sensitive examples.
- Sanitizer transforms expected values correctly.
- Action validator allows and rejects expected actions.
- API schema rejects malformed requests.

## Integration Tests

Test every major contract separately:

```text
DOM → Unified Representation
Vision → Unified Representation
OCR → Unified Representation
Unified Representation → Privacy
Privacy → Backend
Backend → Action Validator
Validator → Browser Executor
```

## End-to-End Test

Minimum E2E:

```text
User task
 ↓
Browser
 ↓
Perception
 ↓
Privacy
 ↓
Sanitized request
 ↓
VLM/LLM
 ↓
Action
 ↓
Local validation
 ↓
Browser execution
```

## Security Tests

Include:

- prompt-injection content;
- malformed actions;
- wrong targets;
- unexpected page changes;
- raw PII in outgoing payload;
- sensitive values in logs;
- permission failures.

## Privacy Tests

Verify that sensitive values intentionally present in test pages do not appear in the protected remote payload.

## Failure Tests

Force:

- model timeout;
- OCR failure;
- vision failure;
- network failure;
- malformed VLM response;
- validator rejection.

Expected behavior must remain safe.
