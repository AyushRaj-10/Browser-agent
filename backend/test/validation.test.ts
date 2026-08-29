import { describe, it, expect } from 'vitest';
import { validateAndSanitizeVlmResponse, EMPTY_ACTION_FALLBACK } from '../src/validation/schema.js';
import { LOGIN_FIXTURE } from './fixtures/payloads.js';

describe('Zod Validation & PII Scanner Layer', () => {
  it('should accept valid VLM response', () => {
    const validJson = JSON.stringify({
      response_type: 'action',
      actions: [
        { action: 'TYPE_REFERENCE', target: 'login_email_input', reference: 'EMAIL_1' },
        { action: 'TYPE_REFERENCE', target: 'login_password_input', reference: 'PASSWORD_1' },
        { action: 'CLICK', target: 'login_submit_btn' }
      ]
    });

    const result = validateAndSanitizeVlmResponse(validJson, LOGIN_FIXTURE);
    expect(result.valid).toBe(true);
    expect(result.response.actions?.length).toBe(3);
  });

  it('should strip markdown code block fences defensively', () => {
    const fencedOutput = `\`\`\`json
{
  "response_type": "action",
  "actions": [
    { "action": "CLICK", "target": "login_submit_btn" }
  ]
}
\`\`\``;

    const result = validateAndSanitizeVlmResponse(fencedOutput, LOGIN_FIXTURE);
    expect(result.valid).toBe(true);
    expect(result.response.actions?.[0].action).toBe('CLICK');
  });

  it('should reject invented target element not present in request context', () => {
    const inventedTargetJson = JSON.stringify({
      response_type: 'action',
      actions: [
        { action: 'CLICK', target: 'INVENTED_HACKER_BUTTON' }
      ]
    });

    const result = validateAndSanitizeVlmResponse(inventedTargetJson, LOGIN_FIXTURE);
    expect(result.valid).toBe(false);
    expect(result.response).toEqual(EMPTY_ACTION_FALLBACK);
    expect(result.errorReason).toContain('was not present in original request context');
  });

  it('should reject action outside fixed vocabulary', () => {
    const badVocabJson = JSON.stringify({
      response_type: 'action',
      actions: [
        { action: 'EXECUTE_SCRIPT', target: 'login_submit_btn' }
      ]
    });

    const result = validateAndSanitizeVlmResponse(badVocabJson, LOGIN_FIXTURE);
    expect(result.valid).toBe(false);
    expect(result.response).toEqual(EMPTY_ACTION_FALLBACK);
  });

  it('should reject TYPE_REFERENCE with invalid reference token', () => {
    const badRefJson = JSON.stringify({
      response_type: 'action',
      actions: [
        { action: 'TYPE_REFERENCE', target: 'login_email_input', reference: 'NON_EXISTENT_REF' }
      ]
    });

    const result = validateAndSanitizeVlmResponse(badRefJson, LOGIN_FIXTURE);
    expect(result.valid).toBe(false);
    expect(result.response).toEqual(EMPTY_ACTION_FALLBACK);
  });

  it('should trigger defense-in-depth PII scanner if VLM leaks an email address', () => {
    const leakedPiiJson = JSON.stringify({
      response_type: 'action',
      actions: [
        { action: 'CLICK', target: 'login_submit_btn', note: 'Sending to user@example.com' }
      ]
    });

    const result = validateAndSanitizeVlmResponse(leakedPiiJson, LOGIN_FIXTURE);
    expect(result.valid).toBe(false);
    expect(result.response).toEqual(EMPTY_ACTION_FALLBACK);
    expect(result.errorReason).toContain('Defense-in-depth PII check failed');
  });

  it('should handle malformed JSON cleanly without throwing', () => {
    const result = validateAndSanitizeVlmResponse('{ bad json: ', LOGIN_FIXTURE);
    expect(result.valid).toBe(false);
    expect(result.response).toEqual(EMPTY_ACTION_FALLBACK);
  });
});
