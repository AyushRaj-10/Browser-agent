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
