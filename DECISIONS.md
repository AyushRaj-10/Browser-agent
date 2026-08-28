# Architecture & Project Decisions

This file records important project decisions so the team does not repeatedly debate the same issues.

Each decision follows:

```text
Decision:
Why:
Alternatives:
Chosen:
Reason:
Impact:
Status:

D001 — Hybrid Local + Remote Architecture

Decision:

Use a hybrid architecture where local browser processing handles perception/privacy-sensitive operations and the remote server handles heavy AI reasoning.

Why:

The local device has direct access to sensitive browser information, while remote systems can provide stronger reasoning capabilities.

Alternatives:

Fully local AI.

Fully cloud AI.

Hybrid architecture.

Chosen:

Hybrid architecture.

Reason:

It provides a practical balance between privacy and computational capability.

Impact:

The system needs a clearly defined client-server privacy boundary.

Status:

Accepted.

D002 — Privacy Processing Happens Before Transmission

Decision:

Sensitive information must be protected before it is included in an outgoing request to the remote AI.

Why:

TLS protects data while it is transmitted, but it does not decide whether the sensitive information should have been included in the request.

Alternatives:

Sanitize on server.

Sanitize before request creation.

Send raw data and rely on encryption.

Chosen:

Sanitize before request transmission.

Reason:

This is the core privacy requirement.

Impact:

The client owns the first privacy decision.

Status:

Accepted.

D003 — Local Vision Is a First-Class Component

Decision:

Local visual processing is a real component of the system and is not replaced entirely by DOM parsing.

Why:

The project requires local visual perception and visual context may contain information that cannot be reliably represented by the DOM.

Alternatives:

DOM only.

Screenshot only.

DOM + OCR + local vision.

Chosen:

DOM + OCR + local vision.

Reason:

Different sources provide different types of information.

Impact:

The system must evaluate visual understanding independently.

Status:

Accepted.

D004 — Unified Perception Representation

Decision:

DOM, OCR, and Vision outputs must be converted into a common representation before privacy processing.

Why:

A sensitive element detected by one channel must not bypass protection because another channel did not detect it.

Alternatives:

Independent privacy filtering per channel.

Unified representation followed by one privacy engine.

Chosen:

Unified representation.

Reason:

Creates one consistent privacy decision point.

Impact:

P1 and P2 must produce compatible structures consumed by P3.

Status:

Accepted.

D005 — Structured Model Actions

Decision:

The remote AI returns structured browser actions rather than arbitrary JavaScript.

Why:

Arbitrary code would give the remote model unnecessary control over the browser.

Alternatives:

Arbitrary JavaScript.

Browser automation framework with unrestricted commands.

Predefined structured actions.

Chosen:

Structured actions.

Example:

{
  "action": "CLICK",
  "target": "submit_button"
}

Reason:

Simpler to validate and safer.

Impact:

The browser executor only supports approved action types.

Status:

Accepted.

D006 — Local Action Validation

Decision:

Every remote action is validated locally before execution.

Why:

The model may be incorrect, the webpage may have changed, or the action may be unsafe.

Alternatives:

Execute immediately.

Validate locally before execution.

Chosen:

Validate locally.

Reason:

The browser remains the final authority over execution.

Impact:

P4 owns action validation.

Status:

Accepted.

D007 — Local Secrets

Decision:

Actual user secrets should remain local whenever possible.

Why:

The remote AI should not need access to the actual secret value merely to reason about a form.

Alternatives:

Store secrets on server.

Send secrets to the model.

Keep secrets locally.

Chosen:

Keep secrets locally.

Reason:

Stronger privacy boundary.

Impact:

Secret-reference mechanisms may be added later but are not required for the minimum viable architecture.

Status:

Accepted.

D008 — No Direct Vision/OCR Network Path

Decision:

Vision and OCR components must not directly send information to the server.

Why:

All outbound agent context must pass through the privacy engine.

Chosen flow:

Vision
   ↓
Unified Representation
   ↓
Privacy Engine
   ↓
Sanitized Context
   ↓
Server

Status:

Accepted.

D009 — Browser Current State Is Authoritative

Decision:

The actual browser state is the source of truth before an action is executed.

Why:

The model may reason using stale information.

Example:

Model says:

CLICK submit_button

But the page has changed.

The validator must reject the stale action.

Status:

Accepted.

D010 — Fail Closed for Privacy

Decision:

If required privacy processing fails, the system must not transmit the corresponding protected context.

Why:

Failing open could expose sensitive information.

Chosen behavior:

Privacy failure
     ↓
Do not transmit protected context
     ↓
Report failure / recover

Status:

Accepted.

D011 — Event-Driven Local Vision

Decision:

Do not continuously run expensive local vision inference.

Preferred triggers:

User starts an AI task.

New page loads.

Significant page change occurs.

Important visual state changes.

Why:

Client resource utilization is one of the SIH evaluation criteria.

Status:

Accepted.

D012 — Chrome and Firefox

Decision:

The final design targets Chrome and Firefox.

Implementation principle:

Keep core logic browser-independent and isolate browser-specific behavior.

Status:

Accepted.

D013 — Single Backend

Decision:

Use a single backend service for the prototype.

Alternatives:

Microservices.

Single backend.

Chosen:

Single backend.

Reason:

The problem does not require distributed infrastructure and simplicity is preferred.

Status:

Accepted.

D014 — No Database in Core MVP Unless Required

Decision:

Do not introduce a database unless a concrete requirement requires persistence.

Why:

The core workflow does not inherently require persistent application data.

Alternatives:

Add database immediately.

Temporary/local state for the prototype.

Chosen:

Avoid unnecessary database infrastructure initially.

Status:

Accepted.

D015 — Minimum Disclosure as Research Direction

Decision:

Task-aware minimum disclosure is considered the main potential differentiator/research direction, but it should not make the initial architecture unnecessarily complicated.

Core question:

What is the minimum information the remote AI needs to complete the current task?

Why:

This may provide a stronger competitive and research contribution than simply performing generic PII redaction.

Important:

This is a research direction, not a requirement that the initial MVP implement a perfect minimum-disclosure algorithm.

Status:

Accepted as research direction.

D016 — Privacy Is More Than Screenshot Redaction

Decision:

Privacy processing must consider all representations that may leave the browser.

These can include:

Screenshot
DOM
OCR text
Vision metadata
Accessibility information
Task context

Why:

Protecting only the screenshot does not guarantee that the same sensitive information is absent from another representation.

Status:

Accepted.

D017 — Mock-First Parallel Development

Decision:

Every component must be independently testable using mock inputs and fixed contracts.

Why:

Team members should not be blocked by another person's implementation.

Chosen model:

Contract
   ↓
Mock
   ↓
Independent development
   ↓
Integration

Status:

Accepted.

D018 — No Unnecessary Feature Expansion

Decision:

Do not add technologies or features simply because they sound sophisticated.

Avoid unless justified:

Blockchain
Federated Learning
Kubernetes
Large microservice systems
Multi-agent swarm
Custom foundation model

Reason:

Complexity should only be introduced when it solves a real project requirement.

Status:

Accepted.