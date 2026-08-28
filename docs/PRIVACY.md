# Privacy Specification

## Privacy Objective

Allow the remote AI to perform useful reasoning without unnecessarily exposing sensitive user information.

## Data Collection

Potentially collected locally:

- DOM information;
- screenshots;
- OCR output;
- vision detections;
- user task.

## Local-Only Data

Preferably kept local:

- raw screenshots;
- raw DOM values containing sensitive information;
- raw OCR containing PII;
- passwords;
- OTPs;
- authentication secrets;
- private keys;
- actual secret values.

## Remotely Permitted Data

Only context that has passed the local privacy policy.

Example:

```text
Local:
Email: ayush@gmail.com

Remote:
Email: <EMAIL>
```

## Sensitive Data Treatment

Potential treatments:

```text
KEEP
MASK
REPLACE
BLOCK
```

## Semantic Protection

When possible, preserve meaning without preserving the actual value.

Example:

```text
ayush@gmail.com
        ↓
<EMAIL>
```

## Privacy Boundary

```text
ORIGINAL DATA
     ↓
LOCAL PRIVACY PROCESSING
     ↓
SANITIZED DATA
     ↓
NETWORK
```

## User Experience

Privacy protection should mostly be invisible during normal browsing. When the agent is active, the user may be shown a protection status or privacy receipt.

## Privacy Verification

The strongest evidence is inspection of the actual outgoing agent payload, not merely a dashboard claim.
