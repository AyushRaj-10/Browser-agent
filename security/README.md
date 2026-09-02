# @browser-agent/security — Person 4 Module

This package implements the **Local Secret Store, Web Crypto (AES-GCM-256) Encryption, Reference Resolution Engine, and Local Action Validator** for the **Privacy-Preserving Browser Vision Agent (SIH26171)**.

---

## 1. Responsibilities & Ownership

| Component | Responsibility | Invariant / Rule |
|---|---|---|
| **Web Crypto (`crypto/`)** | Authenticated AES-GCM 256-bit encryption/decryption, PBKDF2 derivation. | Generates fresh 12-byte random IV per operation. |
| **Secret Store (`storage/`)** | Domain-scoped IndexedDB & in-memory encrypted secret storage. | **Passwords strictly excluded** from storage. |
| **Reference Resolver (`references/`)** | Resolves `<EMAIL_1>`, `<PHONE_1>`, etc. to real values at DOM execution time. | Raw secrets never leave local device; never logged. |
| **Action Validator (`validator/`)** | Pre-execution defense gatekeeper against untrusted models & pages. | Validates action vocabulary, target existence, prompt injection, password refusal. |
| **Setup Controller (`controller/`)** | Headless manager for UI flows and pre-loaded synthetic profiles. | Includes official SIH Synthetic Insurance Claim demo profile. |

---

## 2. Quickstart & Integration Guide for Teammates

### For Person 1 (Extension Shell & UI Settings)
To allow users to view, add, or pre-load synthetic demo credentials:
```typescript
import { SecretSetupController } from "@browser-agent/security";

const controller = new SecretSetupController();
await controller.preloadInsuranceDemoProfile();

// List stored secrets without exposing decrypted values
const metadataList = await controller.listSecrets();
```

### For Person 3 (Privacy Engine)
To generate canonical reference tokens for detected PII elements:
```typescript
import { ReferenceManager } from "@browser-agent/security";

const refManager = new ReferenceManager();
const emailToken = refManager.createReference("EMAIL", "insurance.demo.com", "input_email");
// Returns: "EMAIL_1"
const placeholder = refManager.formatPlaceholder(emailToken);
// Returns: "<EMAIL_1>"
```

### For Person 5 (Backend & VLM Integration)
Person 5 produces structured actions using the allowed vocabulary:
```json
{
  "response_type": "action",
  "actions": [
    { "action": "TYPE_REFERENCE", "target": "input_email", "reference": "EMAIL_1" },
    { "action": "CLICK", "target": "btn_submit" }
  ]
}
```

### For Person 6 (Browser Executor & Integration)
Before executing any action received from remote reasoning:
```typescript
import { ActionValidator, ReferenceResolver } from "@browser-agent/security";

const validator = new ActionValidator();

// 1. Validate action against live page state
const validationResult = await validator.validateAction(proposedAction, {
  currentUrl: window.location.href,
  domElements: pageDomElements,
  activeReferenceMap: sessionReferences,
});

if (!validationResult.allowed) {
  console.warn("Action rejected by local validator:", validationResult.reason);
  return;
}

// 2. Resolve reference token strictly at execution time
if (proposedAction.action === "TYPE_REFERENCE") {
  const resolved = await resolver.resolveActionReference(
    proposedAction,
    window.location.hostname,
    masterKey
  );
  // Type resolved.resolvedValue into DOM element
  domElement.value = resolved.resolvedValue;
}
```

---

## 3. Running Tests

```bash
cd security
npm install
npm test
npm run typecheck
```
