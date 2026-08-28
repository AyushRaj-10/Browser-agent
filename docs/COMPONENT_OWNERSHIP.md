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
