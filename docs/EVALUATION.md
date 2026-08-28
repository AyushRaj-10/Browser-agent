# Evaluation

## Core Claims

### Claim 1
The local system can understand useful visual information.

Measure visual-context accuracy.

### Claim 2
The privacy engine can identify sensitive information.

Measure PII precision and recall.

### Claim 3
The privacy engine can protect sensitive regions accurately.

Measure redaction precision and, where appropriate, bounding-box IoU.

### Claim 4
Local processing is practical.

Measure CPU, RAM, GPU usage, and local inference time.

### Claim 5
The hybrid system can complete useful browser tasks.

Measure task success and end-to-end latency.

## SIH Metrics

| Metric | Weight |
|---|---:|
| Visual context accuracy | 25% |
| PII precision/recall | 20% |
| Redaction precision | 20% |
| Client resource utilization | 20% |
| End-to-end latency | 15% |

## Baselines

### Baseline A — Full Context

Raw permitted context → remote VLM/LLM → action.

### Baseline B — Basic Redaction

Raw context → simple PII masking → remote VLM/LLM → action.

### Proposed System

Local DOM + OCR + vision → unified representation → privacy engine → sanitized context → remote reasoning → local action validation.

## Research Extension

A secondary experiment can compare information disclosure levels:

```text
Full context
     vs
Basic redaction
     vs
Minimum useful context
```

and measure the tradeoff between:

- information exposed;
- task success;
- latency;
- payload size.

## Important Evaluation Rule

Do not claim privacy because the dashboard says privacy was achieved. Inspect the actual outgoing agent payload and compare it with the sensitive information intentionally placed on the test page.

## Stress Tests

Test:

- dense forms;
- sensitive data inside images;
- visually complex pages;
- multiple PII elements;
- missing/ambiguous labels;
- changing page states;
- false-positive-prone text;
- low-confidence detections.
