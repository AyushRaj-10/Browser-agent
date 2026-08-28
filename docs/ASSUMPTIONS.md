# Assumptions

| Assumption | Why | Risk if wrong | Verification |
|---|---|---|---|
| Browser extension can access required page information | Core architecture | Required capability unavailable | Browser prototype |
| Local visual inference is feasible | Core problem requirement | Client resource/latency failure | Local benchmark |
| DOM complements vision | Structured page information is useful | Redundant processing | Perception evaluation |
| OCR helps with visually rendered text | Some text may exist outside useful DOM structure | Added latency | Benchmark |
| Sanitized context can be sufficient for selected tasks | Hybrid architecture depends on it | Task failure | E2E test |
| Structured actions cover the initial demo | Keeps execution bounded | Some tasks unsupported | Demo validation |
| Chrome and Firefox can share most core logic | WebExtension approach | Browser-specific issues | Cross-browser test |
| Remote model can reason over sanitized context | Core cloud reasoning idea | Low task success | E2E evaluation |
| Privacy categories can be defined for V1 | Needed for deterministic evaluation | Scope ambiguity | Team decision |
| The selected remote model is compliant with competition rules | Required for final demo | Compliance risk | Verify with organizers/rules |
