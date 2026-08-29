# Person 5 Module — Backend & VLM Integration

This service provides the reasoning engine and VLM integration API endpoint for the Privacy-Preserving Browser Vision Agent.

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build TypeScript
npm run build

# Start production server
npm start

# Run unit tests
npm test
```

## API Endpoint Contract

Default Base URL: `http://localhost:3000`

### 1. Health Check
- **Endpoint:** `GET /api/health`
- **Auth:** None
- **Response (200 OK):**
```json
{
  "status": "ok"
}
```

---

### 2. Reasoning Endpoint
- **Endpoint:** `POST /api/reason`
- **Auth:** `Authorization: Bearer <API_KEY>` (or shared secret string)
- **Content-Type:** `application/json`

#### Request Body (`SanitizedContext`)
```json
{
  "user_task": "Log me into this site",
  "fields": [
    { "ref": "EMAIL_1", "type": "email", "target": "login_email" },
    { "ref": "PASSWORD_1", "type": "password", "target": "login_password" }
  ],
  "button": { "text": "Login", "target": "login_button" }
}
```

#### Response Body (`StructuredActionResponse`)
- **200 OK (Action Response):**
```json
{
  "response_type": "action",
  "actions": [
    { "action": "TYPE_REFERENCE", "target": "login_email", "reference": "EMAIL_1" },
    { "action": "TYPE_REFERENCE", "target": "login_password", "reference": "PASSWORD_1" },
    { "action": "CLICK", "target": "login_button" }
  ]
}
```

- **Allowed Action Vocabulary:**
  `CLICK` · `SCROLL` · `SELECT` · `TYPE_REFERENCE` · `NAVIGATE` · `WAIT`

- **401 Unauthorized:**
```json
{
  "error": "unauthorized",
  "message": "Invalid API key"
}
```

- **400 Bad Request (Malformed input):**
```json
{
  "error": "invalid_context",
  "message": "Request body must be a valid SanitizedContext JSON object"
}
```

- **Fallback Safe Response (on validation/VLM errors):**
```json
{
  "response_type": "action",
  "actions": []
}
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port for Express server |
| `BACKEND_API_KEY` | `sih-secret-key-2026` | Shared auth token between Extension and Backend |
| `NODE_ENV` | `development` | Environment mode (`development` / `production` / `test`) |
