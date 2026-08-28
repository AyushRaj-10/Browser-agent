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
