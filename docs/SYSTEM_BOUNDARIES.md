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
