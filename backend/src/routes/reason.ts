import { Router, Request, Response } from 'express';
import { SanitizedContextSchema, validateAndSanitizeVlmResponse, EMPTY_ACTION_FALLBACK } from '../validation/schema.js';
import { evaluateFastPath } from '../fast-path/decision.js';
import { callVlm } from '../vlm/client.js';

const router = Router();

router.post('/reason', async (req: Request, res: Response) => {
  // 1. Validate incoming SanitizedContext request body
  const parseResult = SanitizedContextSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'invalid_context',
      message: parseResult.error.message
    });
  }

  const context = parseResult.data;

  try {
    // 2. Fast-Path check (Section 8)
    const fastPathResult = evaluateFastPath(context);
    if (fastPathResult) {
      console.log(`[FastPath Hit] Resolved task without VLM call`);
      return res.status(200).json(fastPathResult);
    }

    // 3. Call VLM API (Section 6)
    const rawVlmOutput = await callVlm(context);

    // 4. Response Validation Layer (Section 7)
    const validationResult = validateAndSanitizeVlmResponse(rawVlmOutput, context);

    if (!validationResult.valid) {
      console.warn(`[VLM Response Rejected] Reason: ${validationResult.errorReason}`);
      return res.status(422).json({
        error: 'vlm_output_rejected',
        message: validationResult.errorReason,
        response: EMPTY_ACTION_FALLBACK
      });
    }

    // 5. Return validated response
    return res.status(200).json(validationResult.response);
  } catch (err: any) {
    console.error(`[Reason Route Error] ${err?.message || 'Server error'}`);
    return res.status(500).json({
      error: 'server_error',
      message: 'Failed to process reasoning request',
      response: EMPTY_ACTION_FALLBACK
    });
  }
});

export default router;
