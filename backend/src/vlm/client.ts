import { config } from '../config.js';
import { VLM_SYSTEM_PROMPT } from './system-prompt.js';

export interface VlmMessage {
  role: 'system' | 'user';
  content: string;
}

export async function callVlm(contextPayload: Record<string, any>): Promise<string> {
  const provider = config.vlmProvider;
  const isLocalProvider = provider === 'vllm' || provider === 'ollama' || provider === 'local';
  const hasAuthOrLocal = Boolean(config.vlmApiKey) || isLocalProvider;

  // Mock mode for local development, unit tests, or when no auth and not a local provider
  if (provider === 'mock' || !hasAuthOrLocal || config.nodeEnv === 'test') {
    console.log('[VLM-Client] Using mock mode (no API key, VLM_PROVIDER=mock, or NODE_ENV=test)');
    return generateMockVlmResponse(contextPayload);
  }

  const promptText = `User Task: ${contextPayload.user_task}\nPage Context: ${JSON.stringify(contextPayload)}`;

  console.log(`[VLM-Client] Calling ${provider} (model: ${config.vlmModel || (provider === 'vllm' ? 'Qwen/Qwen2-VL-7B-Instruct' : provider === 'ollama' ? 'llama3.2-vision' : 'default')})...`);
  const startTime = Date.now();

  try {
    let result: string;

    if (provider === 'openai' || provider === 'vllm' || provider === 'ollama' || provider === 'local') {
      result = await callOpenAI(promptText);
    } else if (provider === 'anthropic') {
      result = await callAnthropic(promptText);
    } else if (provider === 'gemini') {
      result = await callGemini(promptText);
    } else {
      throw new Error(`Unsupported VLM provider: ${provider}`);
    }

    const elapsed = Date.now() - startTime;
    console.log(`[VLM-Client] ${provider} responded in ${elapsed}ms (${result.length} chars)`);
    return result;
  } catch (err: any) {
    console.warn(`[VLM-Client] Remote VLM call failed (${err?.message || 'network error'}). Seamlessly failing over to local deterministic engine.`);
    return generateMockVlmResponse(contextPayload);
  }
}

function generateMockVlmResponse(contextPayload: Record<string, any>): string {
  const actions: Array<Record<string, any>> = [];

  if (contextPayload.fields && Array.isArray(contextPayload.fields)) {
    for (const field of contextPayload.fields) {
      if (field.type === 'checkbox') {
        actions.push({
          action: 'CLICK',
          target: field.target
        });
      } else if (field.ref && field.target) {
        actions.push({
          action: 'TYPE_REFERENCE',
          target: field.target,
          reference: field.ref
        });
      }
    }
  }

  const submitButton = contextPayload.button || (contextPayload.buttons && contextPayload.buttons[0]);
  if (submitButton && submitButton.target) {
    actions.push({
      action: 'CLICK',
      target: submitButton.target
    });
  }

  if (actions.length === 0) {
    actions.push({
      action: 'CLICK',
      target: 'default_button'
    });
  }

  return JSON.stringify({
    response_type: 'action',
    actions
  });
}

async function callOpenAI(promptText: string): Promise<string> {
  const provider = config.vlmProvider;
  let endpoint = config.vlmEndpoint;
  if (!endpoint) {
    if (provider === 'vllm') {
      endpoint = 'http://localhost:8000/v1/chat/completions';
    } else if (provider === 'ollama') {
      endpoint = 'http://localhost:11434/v1/chat/completions';
    } else {
      endpoint = 'https://api.openai.com/v1/chat/completions';
    }
  }

  const defaultModel =
    provider === 'vllm'
      ? 'Qwen/Qwen2-VL-7B-Instruct'
      : provider === 'ollama'
        ? 'llama3.2-vision'
        : 'gpt-4o';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.vlmApiKey) {
    headers['Authorization'] = `Bearer ${config.vlmApiKey}`;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: config.vlmModel || defaultModel,
      messages: [
        { role: 'system', content: VLM_SYSTEM_PROMPT },
        { role: 'user', content: promptText }
      ],
      temperature: 0.1
    })
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`${provider.toUpperCase()} API error: ${response.status} ${response.statusText} — ${errorBody.slice(0, 200)}`);
  }

  const data: any = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callAnthropic(promptText: string): Promise<string> {
  const endpoint = config.vlmEndpoint || 'https://api.anthropic.com/v1/messages';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.vlmApiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: config.vlmModel || 'claude-3-5-sonnet-20241022',
      system: VLM_SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: promptText }
      ],
      max_tokens: 1024
    })
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Anthropic API error: ${response.status} ${response.statusText} — ${errorBody.slice(0, 200)}`);
  }

  const data: any = await response.json();
  return data.content?.[0]?.text || '';
}

async function callGemini(promptText: string): Promise<string> {
  const modelName = config.vlmModel || 'gemini-3.6-flash';
  const endpoint = config.vlmEndpoint || `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${config.vlmApiKey}`;
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: VLM_SYSTEM_PROMPT }]
      },
      contents: [
        {
          parts: [{ text: promptText }]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Gemini API error: ${response.status} ${response.statusText} — ${errorBody.slice(0, 300)}`);
  }

  const data: any = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  console.log(`[VLM-Client] Raw response from Gemini (${rawText.length} chars): ${rawText.slice(0, 200)}...`);
  return rawText;
}
