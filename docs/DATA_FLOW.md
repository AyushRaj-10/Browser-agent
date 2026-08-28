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
