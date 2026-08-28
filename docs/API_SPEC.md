# API Specification

## Purpose

Provide a minimal interface between the browser extension and the remote reasoning backend.

## Endpoint

`POST /agent/context`

## Request

```json
{
  "task": "Submit the insurance application",
  "context": {
    "page": {},
    "elements": [],
    "visual": {}
  }
}
```

The `context` object must already have passed through the local privacy engine.

## Response

```json
{
  "action": {
    "action": "CLICK",
    "target": "submit_button"
  }
}
```

## Supported Actions

```text
CLICK
SCROLL
TYPE
SELECT
```

## Validation

The backend must validate:

- request structure;
- required fields;
- action schema;
- allowed action names.

The client must perform its own action validation before execution.

## Authentication

Authentication is separate from privacy.

A token such as JWT may answer:

> Who is making this request?

It does not answer:

> Is the request allowed to contain this data?

## Errors

```json
{
  "error": {
    "code": "INVALID_CONTEXT",
    "message": "Context validation failed"
  }
}
```

Suggested codes:

```text
INVALID_REQUEST
INVALID_CONTEXT
UNAUTHORIZED
RATE_LIMITED
MODEL_FAILURE
MODEL_TIMEOUT
INTERNAL_ERROR
```

## Data Rule

The endpoint must not be used as a place to perform first-pass privacy filtering. Protected context should already be sanitized by the client.
