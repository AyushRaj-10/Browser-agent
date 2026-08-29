import { SanitizedContext, StructuredActionResponse } from '../validation/schema.js';

/**
 * Evaluates whether a SanitizedContext payload can be resolved deterministically
 * via a fast-path decision rule, skipping the full VLM call to minimize latency & costs.
 */
export function evaluateFastPath(context: SanitizedContext): StructuredActionResponse | null {
  const taskLower = (context.user_task || '').toLowerCase().trim();
  const hasFields = context.fields && context.fields.length > 0;
  const hasButton = !!context.button && !!context.button.target;

  // Fast-Path Rule 1: Single button present, no input fields, task implies clicking/submitting
  if (!hasFields && hasButton) {
    const buttonText = (context.button?.text || '').toLowerCase();
    const isClickTask = taskLower.includes('click') || 
                       taskLower.includes('press') || 
                       taskLower.includes('submit') || 
                       taskLower.includes('login') ||
                       (buttonText && taskLower.includes(buttonText));

    if (isClickTask || taskLower.length === 0) {
      return {
        response_type: 'action',
        actions: [
          {
            action: 'CLICK',
            target: context.button!.target
          }
        ]
      };
    }
  }

  // Fast-Path Rule 2: Single element explicit task match (e.g. "click <target>")
  if (!hasFields && hasButton && taskLower === `click ${context.button!.target.toLowerCase()}`) {
    return {
      response_type: 'action',
      actions: [
        {
          action: 'CLICK',
          target: context.button!.target
        }
      ]
    };
  }

  // No fast-path match -> fall through to VLM
  return null;
}
