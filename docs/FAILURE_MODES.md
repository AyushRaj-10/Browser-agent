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
