import { SanitizedContext } from '../../src/validation/schema.js';

export const LOGIN_FIXTURE: SanitizedContext = {
  user_task: 'Log me into this site',
  fields: [
    { ref: 'EMAIL_1', type: 'email', target: 'login_email_input' },
    { ref: 'PASSWORD_1', type: 'password', target: 'login_password_input' }
  ],
  button: { text: 'Login', target: 'login_submit_btn' }
};

export const INSURANCE_CLAIM_FIXTURE: SanitizedContext = {
  user_task: 'Submit insurance claim for claim REF_99',
  fields: [
    { ref: 'CLAIM_ID_1', type: 'text', target: 'claim_number_field' },
    { ref: 'POLICY_ID_1', type: 'text', target: 'policy_number_field' }
  ],
  button: { text: 'Submit Claim', target: 'submit_claim_btn' }
};

export const SINGLE_BUTTON_FIXTURE: SanitizedContext = {
  user_task: 'Click the confirm button',
  button: { text: 'Confirm', target: 'confirm_btn' }
};
