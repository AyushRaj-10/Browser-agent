# Database Plan

## V1 Decision

A persistent database is **not required for the core prototype**.

The core system can operate with:

- temporary browser state;
- temporary backend request state;
- local secure storage if secret handling is implemented;
- files/artifacts for evaluation results.

## Why

The project is primarily about:

```text
local perception
→ privacy protection
→ sanitized reasoning
→ browser action
```

A database does not directly solve any of those core requirements.

## Possible Future Persistent Data

If persistence becomes necessary, it may include:

```text
User
Task
EvaluationRun
MetricResult
```

but these should be introduced only when there is a concrete requirement.

## Source of Truth

- Current webpage: browser state.
- Sensitive-data decision: local privacy engine.
- Actual secrets: local secure store if implemented.
- Remote reasoning result: server response for that request.
- Final browser state: browser itself.
- Evaluation metrics: evaluation artifacts.
