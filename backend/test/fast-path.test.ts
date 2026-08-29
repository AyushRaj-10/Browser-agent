import { describe, it, expect } from 'vitest';
import { evaluateFastPath } from '../src/fast-path/decision.js';
import { SINGLE_BUTTON_FIXTURE, LOGIN_FIXTURE } from './fixtures/payloads.js';

describe('Backend Fast-Path Decision Logic', () => {
  it('should return fast-path CLICK action for single button payload', () => {
    const result = evaluateFastPath(SINGLE_BUTTON_FIXTURE);
    expect(result).not.toBeNull();
    expect(result?.response_type).toBe('action');
    expect(result?.actions?.[0]).toEqual({
      action: 'CLICK',
      target: 'confirm_btn'
    });
  });

  it('should return null and fall through to VLM for complex multi-field payload', () => {
    const result = evaluateFastPath(LOGIN_FIXTURE);
    expect(result).toBeNull();
  });
});
