# Privacy-Preserving Browser Vision Agent

A browser-based AI agent that can understand and operate webpages while protecting sensitive user information before it is sent to remote AI systems.

---

## 1. Problem

Browser AI agents need to understand a user's screen to perform tasks such as:

- Filling forms
- Clicking buttons
- Scrolling
- Navigating webpages

However, webpages may contain sensitive information such as:

- Passwords
- Email addresses
- Phone numbers
- Faces
- Government IDs
- Private documents

Sending the complete screen to a remote AI may expose information that the AI does not actually need.

### Problem Statement

> How can a browser AI agent use powerful remote reasoning while protecting sensitive information locally before that information is transmitted?

---

## 2. Goal

Our goal is to build a browser AI agent that:

1. Understands the webpage locally.
2. Detects sensitive information locally.
3. Protects sensitive information before transmission.
4. Sends only safe/sanitized context to the server when remote reasoning is needed.
5. Receives a structured action from the remote AI.
6. Validates the action locally.
7. Executes the action in the browser.

---

## 3. Core Idea

The system follows:

```text
SEE LOCALLY
      ↓
PROTECT LOCALLY
      ↓
SEND SAFE CONTEXT
      ↓
REASON REMOTELY
      ↓
VALIDATE LOCALLY
      ↓
ACT LOCALLY

The local browser is responsible for:

Perception

Privacy

Secret protection

Final action validation

The remote AI is responsible for:

Heavy reasoning

Task planning

Action generation

4. Core Architecture

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
               │               Local Vision
               │                     │
               │                    OCR
               │                     │
               └──────────┬──────────┘
                          ▼
                 Unified Screen Data
                          │
                          ▼
                 ┌─────────────────┐
                 │ Privacy Engine  │
                 └────────┬────────┘
                          │
                    SAFE CONTEXT
                          │
                    PRIVACY WALL
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

5. Complete Data Flow

USER TASK
    ↓
BROWSER PAGE
    ↓
LOCAL PERCEPTION
    ↓
DOM + VISION + OCR
    ↓
UNIFIED SCREEN REPRESENTATION
    ↓
PRIVACY ANALYSIS
    ↓
SANITIZATION
    ↓
SANITIZED CONTEXT
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

6. Privacy Boundary

The central privacy rule is:

Raw sensitive information must not cross the client-to-server privacy boundary.

Example:

Original

Email: ayush@gmail.com
Phone: 9876543210
Password: abc123
Button: Submit

Sanitized

Email: <EMAIL>
Phone: <PHONE>
Password: <PASSWORD>
Button: Submit

The actual sensitive values should remain local whenever possible.

7. Why Local Vision Is Required

DOM information can tell us about structured webpage elements.

For example:

<input type="password">
<button>Submit</button>

However, visual information may exist that cannot be reliably understood from the DOM alone.

Example:

┌────────────────────────────┐
│ Uploaded ID                │
│                            │
│       [ PERSON'S FACE ]    │
│                            │
└────────────────────────────┘

The DOM may only tell us:

There is an image.

A local vision model may identify:

There is a face in the image.

Therefore:

DOM   → Structure
OCR   → Visible text
Vision → Visual information

All three can contribute to the final understanding of the page.

8. X-Factor

Our potential competitive direction is:

Task-aware minimum disclosure.

Instead of asking only:

"Is this information sensitive?"

we also ask:

"Does the remote AI actually need this information for the current task?"

For example, if the task is:

"Click Submit"

the remote AI may only need:

Submit button
Position
State

rather than:

Name
Email
Phone
Password

This is a research/differentiation direction and should not unnecessarily complicate the initial MVP.

9. SIH Evaluation Criteria

The stated evaluation criteria are:

Metric

Weight

Accuracy of visual context from screen

25%

Precision and recall for sensitive/PII data

20%

Precision of redaction

20%

Client-side resource utilization

20%

Overall end-to-end latency

15%

These metrics should directly influence development and evaluation priorities.

10. Target Browsers

The final system targets:

Chrome

Firefox

Core logic should remain browser-independent wherever possible.

Browser-specific code should be isolated.

11. Recommended Technology

Browser Extension

TypeScript

WebExtension APIs

Manifest V3

React for extension UI

Local Processing

ONNX Runtime Web

WebGPU where available

WebAssembly fallback

OCR library such as Tesseract.js

Backend

Node.js

Express

Remote Reasoning

Permitted LLM/VLM

Open-source/open-weight model where required

Cloud-hosted version where permitted

Local Storage

IndexedDB

Web Crypto API where encrypted local storage is required

12. Team Ownership

Person 1 → Extension / DOM / UI
Person 2 → Local Vision / OCR
Person 3 → Privacy Engine
Person 4 → Security / Secrets / Action Validation
Person 5 → Backend / VLM
Person 6 → Integration / Testing / Evaluation

13. Development Principle

The project is developed using shared contracts.

Each component should support:

REAL INPUT
+
MOCK INPUT
+
FIXED OUTPUT
+
FIXED CONTRACT

This allows team members to work independently.

A developer should not need to wait for another person's implementation when a mock or stub can be used.

14. Repository Structure

privacy-browser-agent/
│
├── README.md
├── CONTRIBUTING.md
├── DECISIONS.md
│
├── docs/
│   ├── PROJECT_OVERVIEW.md
│   ├── TEAM_MENTAL_MODEL.md
│   ├── REQUIREMENTS.md
│   ├── ARCHITECTURE.md
│   ├── DATA_FLOW.md
│   ├── DATA_LINEAGE.md
│   ├── DATA_CLASSIFICATION.md
│   ├── SYSTEM_BOUNDARIES.md
│   ├── COMPONENT_OWNERSHIP.md
│   ├── INTERFACES.md
│   ├── API_SPEC.md
│   ├── DATA_SCHEMAS.md
│   ├── DATABASE.md
│   ├── MODEL_SPEC.md
│   ├── SECURITY.md
│   ├── PRIVACY.md
│   ├── BOUNDARIES.md
│   ├── ASSUMPTIONS.md
│   ├── OPEN_QUESTIONS.md
│   ├── FAILURE_MODES.md
│   ├── TESTING.md
│   ├── EVALUATION.md
│   └── COMPETITIVE_EDGE.md
│
├── shared/
├── extension/
├── vision/
├── privacy/
├── security/
├── backend/
├── demo/
├── evaluation/
└── tests/

15. Important Rules

Raw sensitive information must not be transmitted to the server unnecessarily.

Privacy protection must happen before the relevant data is transmitted.

DOM, OCR, and vision outputs must pass through the privacy layer.

The remote model receives sanitized context.

The remote model returns structured actions.

The browser validates the action locally.

The browser's current state is authoritative.

Unknown or malformed actions are rejected.

Sensitive values must not be written to logs.

If required privacy processing fails, protected data must not be transmitted.

Do not introduce unnecessary infrastructure.

Follow shared interfaces and schemas.

Keep component ownership clear.

Use mocks/stubs to avoid unnecessary blocking.

Do not change shared architecture without documenting the decision.

16. Non-Goals

We are not trying to build:

A custom foundation LLM

A custom browser

A blockchain system

A federated-learning system

A large distributed architecture

A multi-agent swarm

A complete password manager

An OS-level surveillance system

A system that solves every possible browser-security problem

17. Definition of Success

The project is successful when:

✓ The browser can understand relevant page/screen information.
✓ Local visual processing works.
✓ Sensitive information is detected.
✓ Sensitive information is sanitized.
✓ Raw sensitive information does not cross the privacy boundary.
✓ The remote AI can reason from sanitized context.
✓ The remote AI can return a valid structured action.
✓ The browser can safely execute the action.
✓ The end-to-end task succeeds.
✓ SIH evaluation metrics can be measured.

18. Documentation

The docs/ directory is the project's source of truth for:

Requirements

Architecture

Data flow

Data lineage

Interfaces

Data schemas

Security

Privacy

Ownership

Testing

Evaluation

Competitive differentiation

Before changing an important architectural or data-flow decision, check the relevant documentation and update it when necessary.

