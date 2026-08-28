# Security Specification

## Threat Model

We assume that webpage content, remote model output, and external network content may be untrusted.

## Trusted Local Controls

- Browser extension's privacy engine.
- Local secret store, if used.
- Local action validator.
- Current browser state.

## Potentially Untrusted

- Website content.
- Webpage instructions.
- Remote model output.
- External services.
- Remote network content.

## Attacker CAN Potentially

- Display misleading content.
- Place prompt-injection instructions on a page.
- Put sensitive information into images.
- Cause the UI to change unexpectedly.
- Return or induce malformed external responses.

## Attacker MUST NOT Be Allowed To

- Override local privacy decisions.
- Read local secret values directly through the agent flow.
- Force raw sensitive context across the privacy boundary.
- Execute arbitrary model-generated browser code.
- Bypass action validation.

## Action Security

The remote model should return a constrained action language:

```text
CLICK
SCROLL
TYPE
SELECT
```

The local validator checks the action against current browser state before execution.

## Fail-Closed Rule

If a required privacy step fails, the system should not transmit the affected protected context.

## Logging

Do not log:

- passwords;
- authentication tokens;
- private keys;
- raw sensitive screenshots;
- unnecessary raw PII.

Prefer safe operational logs such as:

```text
PII detected: 4
Raw sensitive values transmitted: 0
Action: CLICK
Latency: 780 ms
```
