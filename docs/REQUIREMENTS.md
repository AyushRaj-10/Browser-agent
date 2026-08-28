# Requirements

## Functional Requirements

| ID | Requirement | Description |
|---|---|---|
| FR-01 | User task | Accept a user instruction for browser assistance. |
| FR-02 | Browser extension | Operate as a client-side browser extension/JS component. |
| FR-03 | Local observation | Observe relevant webpage/screen state locally. |
| FR-04 | Local visual processing | Run lightweight computer-vision processing locally. |
| FR-05 | Sensitive-data detection | Detect sensitive or personal information. |
| FR-06 | Pre-transmission sanitization | Sanitize sensitive information before the corresponding agent context is transmitted. |
| FR-07 | Sanitized transmission | Permit only sanitized/allowed context to reach the remote reasoning system. |
| FR-08 | Remote reasoning | Use an LLM/VLM for heavier reasoning when needed by the selected architecture. |
| FR-09 | Action generation | Produce structured browser actions. |
| FR-10 | Local action validation | Validate model-generated actions against current browser state. |
| FR-11 | Browser execution | Execute approved actions locally. |
| FR-12 | End-to-end task | Demonstrate a complete task from user instruction to browser result. |
| FR-13 | Browser target | Target Chrome and Firefox for the final client. |

## Non-Functional Requirements

- Privacy: sensitive information must be protected before transmission.
- Accuracy: visual/page understanding must be measurable.
- Detection quality: PII precision and recall must be measurable.
- Redaction precision: protected regions should be accurate.
- Resource efficiency: client CPU/RAM/GPU usage must be measured.
- Latency: end-to-end task latency must be measured.
- Reliability: component failures must result in safe behavior.
- Security: model output must not automatically gain unrestricted browser control.

## Research Requirements

- Define a baseline.
- Define a test set and ground truth.
- Measure visual-context accuracy.
- Measure PII precision/recall.
- Measure redaction precision.
- Measure client resource usage.
- Measure end-to-end latency.
- Measure task success.
- Evaluate the proposed privacy approach against meaningful alternatives.
