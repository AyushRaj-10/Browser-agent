# Allowed / Not Allowed / Out of Scope

## ALLOWED

- Browser extensions.
- Local DOM analysis.
- Local screenshots.
- Local OCR.
- Local computer vision.
- WebGPU/WebAssembly/browser inference runtimes.
- Local PII detection.
- Local redaction.
- Sanitized network transmission.
- Server-side LLM/VLM reasoning.
- Existing pretrained models.
- Structured browser actions.
- Local action validation.
- Cloud-hosted reasoning where permitted by the competition rules.

## NOT ALLOWED

- Raw sensitive context being intentionally sent to the remote reasoning service in the protected flow.
- First-pass privacy filtering only after data reaches the server.
- Logging unnecessary sensitive values.
- Blind arbitrary-code execution from model output.
- Bypassing browser permission boundaries.
- Treating TLS as a substitute for privacy filtering.

## OUT OF SCOPE

- Building a new browser.
- Training a foundation model.
- Blockchain.
- Federated learning.
- Massive microservice infrastructure.
- Full password-manager replacement.
- OS-wide surveillance.
- Solving every possible browser security vulnerability.
- Guaranteeing perfect PII detection for every possible data type.
