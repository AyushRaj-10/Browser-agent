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
