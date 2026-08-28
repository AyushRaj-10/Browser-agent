# Data Classification

| Data type | Sensitivity | Required? | Stored? | External transmission? | Access |
|---|---|---:|---:|---:|---|
| User task | Low/medium | Yes | Temporary | If needed for remote reasoning | Extension + backend |
| Raw DOM | Potentially high | Yes | Temporary | No raw transmission | Local |
| Raw screenshot | Potentially high | Yes | Temporary | No raw transmission in protected flow | Local |
| OCR text | Context-dependent | Conditional | Temporary | Sanitized only | Local |
| Vision detections | Context-dependent | Yes | Temporary | Sanitized derivative | Local/server |
| Email | Sensitive | Conditional | Prefer local/reference | Prefer not raw | Local |
| Phone | Sensitive | Conditional | Prefer local/reference | Prefer not raw | Local |
| Password | Highly sensitive | Conditional | Local only | No | Local |
| OTP | Highly sensitive | Conditional | Local only | No | Local |
| Face | Sensitive | Conditional | Temporary | Anonymized derivative only | Local |
| Sanitized context | Reduced sensitivity | Yes when cloud used | Temporary | Yes | Local + server |
| Model output | Usually low | Yes | Temporary | Yes | Server + client |
| Action | Usually low | Yes | Temporary | Yes | Client |
| Metrics | Usually low | Yes for evaluation | Yes | Controlled | Team |
| Logs | Variable | Operationally useful | Controlled | Avoid sensitive content | Restricted |

## Core Rule

> A data item is not safe merely because it is encrypted in transit. The system must decide whether the item should be transmitted at all, before it becomes part of the outgoing agent request.
