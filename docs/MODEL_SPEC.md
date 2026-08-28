# Model and Algorithm Specification

## 1. Local Vision

### Purpose

Understand visual elements that are not reliably represented by the DOM alone.

### Input

Screenshot/image.

### Output

Visual detections with type, bounding box, and confidence.

### Execution

Possible browser runtimes include WebGPU and WebAssembly through a browser-compatible inference runtime such as ONNX Runtime Web. The exact model must be selected and documented before implementation is frozen.

---

## 2. OCR

### Purpose

Extract text that appears visually.

### Input

Screenshot or image region.

### Output

Text, bounding boxes, and confidence.

---

## 3. PII/Sensitivity Detection

Use a hybrid strategy:

```text
DOM signals
+
Rules / regex
+
OCR context
+
Vision detections
+
Optional ML context detection
```

Typical initial categories:

```text
EMAIL
PHONE
PASSWORD
PERSON
CREDIT_CARD
FACE
```

The exact V1 category list is an open project decision.

---

## 4. Privacy Treatment

Every protected element receives a treatment:

```text
KEEP
MASK
REPLACE
BLOCK
```

The treatment depends on sensitivity and usefulness of the context.

---

## 5. Remote VLM/LLM

### Purpose

Reason over sanitized context and generate a structured browser action.

### Input

```text
User task
+
Sanitized context
```

### Output

```text
AgentAction
```

The exact provider/model must comply with the competition rules.

---

## 6. Important Separation

The following are different problems:

```text
Vision
= What is visually present?

Privacy
= What is sensitive and how should it be protected?

Reasoning
= Given safe context, what should happen?

Execution
= Is the action valid and should it happen?
```
