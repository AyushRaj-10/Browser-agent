This project uses a **contract-first, modular development model**.

The goal is to let every team member work independently without unnecessarily blocking other team members.

---

# 1. Before You Start

Read these files first:

```text
README.md

docs/PROJECT_OVERVIEW.md
docs/TEAM_MENTAL_MODEL.md
docs/REQUIREMENTS.md
docs/ARCHITECTURE.md
docs/DATA_FLOW.md
docs/SYSTEM_BOUNDARIES.md
docs/COMPONENT_OWNERSHIP.md
docs/INTERFACES.md

Every developer must understand the complete high-level project before modifying their component.

2. Team Ownership

The current ownership model is:

Person 1 → Extension / DOM / UI
Person 2 → Local Vision / OCR
Person 3 → Privacy Engine
Person 4 → Security / Secrets / Action Validation
Person 5 → Backend / VLM
Person 6 → Integration / Testing / Evaluation

Ownership means:

You are responsible for your component.

You decide its internal implementation.

You maintain its tests.

You follow shared contracts.

You document important behavior.

Ownership does NOT mean:

You can change another component's contract or responsibilities without agreement.

3. Core Development Principle

The most important development rule is:

Build your component against the shared contract, not against another person's implementation.

Example:

Person 2
Local Vision
      ↓
VisionResult
      ↓
Person 3
Privacy Engine

Person 3 can develop using mock VisionResult data.

Person 2 does not need to finish first.

4. Branching Strategy

Use one feature branch for each workstream.

main
│
├── feature/p1-extension
├── feature/p2-vision
├── feature/p3-privacy
├── feature/p4-security
├── feature/p5-backend
└── feature/p6-evaluation

Do not develop directly on main.

5. Branch Naming

Use:

feature/<owner>-<short-description>

Examples:

feature/p1-dom-analyzer
feature/p2-ocr
feature/p3-pii-detector
feature/p4-action-validator
feature/p5-vlm-integration
feature/p6-evaluation

For bug fixes:

fix/<owner>-<short-description>

6. Commits

Keep commits small and meaningful.

Good:

feat: add DOM element extraction
feat: add email PII detector
fix: handle missing screenshot
test: add action validator tests

Avoid:

update
changes
final
new code
stuff

A commit should ideally represent one logical change.

7. Pull Requests

Every feature should go through a pull request.

A pull request should explain:

What changed?
Why?
Which component?
Any contract changes?
How was it tested?

Example:

## What changed

Added local email and phone detection.

## Why

Required by the privacy engine.

## Contract changes

None.

## Testing

Added unit tests for:
- email
- phone
- invalid input

8. Code Review

Reviewers should focus on:

Correctness

Contract compatibility

Security

Privacy

Tests

Unnecessary complexity

Do not rewrite another person's internal implementation simply because you would implement it differently.

9. Shared Contracts

Shared contracts include:

shared/types.ts
shared/schemas.ts
shared/constants.ts

These are shared by multiple components.

Do not silently change them.

If a change is required:

Explain why.

Discuss impact.

Update the schema.

Update affected producers/consumers.

Update documentation.

10. Working Independently

Every component should support mocked inputs.

Example:

Vision
   ↓
VisionResult
   ↓
Privacy Engine

The Privacy Engine must be able to test using:

{
  "vision": [
    {
      "type": "FACE",
      "confidence": 0.95
    }
  ]
}

without waiting for the real vision model.

The same principle applies to every component.

11. Do Not Create Unnecessary Dependencies

Avoid:

P1 must finish before P2 can start.
P2 must finish before P3 can start.
P3 must finish before P5 can start.

Prefer:

Contract
   ↓
Mock
   ↓
Independent development
   ↓
Integration

12. Privacy Rules

Never:

Log raw passwords.

Commit credentials.

Commit API keys.

Send raw sensitive data unnecessarily.

Bypass the privacy engine.

Create a direct Vision/OCR → Server path.

Correct:

Vision/OCR/DOM
      ↓
Privacy Engine
      ↓
Sanitized Context
      ↓
Server

13. Environment Variables

Never commit real secrets.

Use:

.env

and provide:

.env.example

Example:

SERVER_PORT=3000
MODEL_API_KEY=
MODEL_ENDPOINT=

The .env.example file must contain placeholders only.

14. Documentation Changes

If implementation changes the behavior of the system, update the relevant documentation.

Examples:

Architecture change:

docs/ARCHITECTURE.md

Data-flow change:

docs/DATA_FLOW.md

API change:

docs/API_SPEC.md
docs/INTERFACES.md

Privacy change:

docs/PRIVACY.md
docs/BOUNDARIES.md

15. Contract-First Rule

Before connecting two components:

Producer
   ↓
Contract
   ↓
Consumer

Both sides must agree on:

Input

Output

Errors

Required fields

Optional fields

Validation

16. Testing Requirements

Each component owner is responsible for tests for their component.

Minimum expectations:

Unit tests
Integration tests where applicable
Failure-case tests
Contract/schema validation

P6 owns end-to-end testing and evaluation.

17. Security Requirement

Never assume:

LLM output = trusted
Website content = trusted
External API = trusted

The browser must validate model-generated actions.

18. Pull Request Checklist

Before requesting review:

[ ] Code builds
[ ] Tests pass
[ ] No secrets committed
[ ] No sensitive information in logs
[ ] Shared interfaces respected
[ ] Documentation updated if necessary
[ ] No unrelated changes
[ ] Error handling included

19. Integration Rule

Integration should connect components through their contracts.

Do not solve integration problems by silently changing another person's internal implementation.

If a contract is insufficient:

Identify problem
     ↓
Discuss
     ↓
Update contract
     ↓
Both sides update independently

20. Conflict Resolution

If two developers disagree:

Check the existing project documentation.

Check the relevant interface.

Prefer the simpler solution.

Record important architectural decisions in DECISIONS.md.

Do not repeatedly reopen an already-decided architecture choice without new evidence.

21. Golden Rule

Build your component independently, follow the contract, protect the privacy boundary, and do not assume another person's implementation details.

