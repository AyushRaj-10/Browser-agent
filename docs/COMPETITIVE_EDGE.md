# Competitive Edge

## What Typical Teams May Build

A likely approach is:

```text
Screenshot
 ↓
PII detector
 ↓
Mask PII
 ↓
Cloud VLM
 ↓
Browser action
```

This is valid but easy to understand and easy to reproduce.

## What We Want to Build

```text
DOM + Screenshot + OCR/Vision
          ↓
   Unified screen understanding
          ↓
      Privacy reasoning
          ↓
  Reveal only useful/safe context
          ↓
       Remote reasoning
          ↓
      Local validation
          ↓
          Browser
```

## X-Factor

**Task-aware minimum disclosure.**

The system should eventually ask:

> What does the remote model actually need to know for this task?

rather than only:

> What should be hidden?

## Why It Matters

For a task such as:

```text
"Click Submit"
```

the model may only need:

```text
Submit button exists
Position
Enabled state
```

It may not need:

```text
Name
Email
Phone
Password
```

## What We Must Prove

The strongest competitive claim is not “we use a vision model” or “we hide PII.”

It is:

> **We can reduce unnecessary information exposed to the remote agent while preserving useful task performance.**

## Proof

Show the judge:

```text
What exists locally
       ↓
What was detected
       ↓
What was protected
       ↓
What actually left the device
       ↓
What the remote AI decided
       ↓
What the browser executed
```

## Do Not Compete On

- biggest model;
- most infrastructure;
- most browser commands;
- biggest UI;
- artificial architectural complexity.

## Strategic Wedge

Become the team that makes **privacy-preserving information flow** the visible center of the browser-agent problem.

## Research Direction

Measure the privacy–task-success tradeoff rather than claiming that the underlying idea of local redaction is itself new.
