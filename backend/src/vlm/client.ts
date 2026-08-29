import { config } from '../config.js';
import { VLM_SYSTEM_PROMPT } from './system-prompt.js';

export interface VlmMessage {
  role: 'system' | 'user';
  content: string;
}

export async function callVlm(contextPayload: Record<string, any>): Promise<string> {
  const provider = config.vlmProvider;

  // Mock mode for local development and unit tests
  if (provider === 'mock' || !config.vlmApiKey) {
    return generateMockVlmResponse(contextPayload);
  }

  const promptText = `User Task: ${contextPayload.user_task}\nPage Context: ${JSON.stringify(contextPayload)}`;

  if (provider === 'openai') {
    return callOpenAI(promptText);
  } else if (provider === 'anthropic') {
    return callAnthropic(promptText);
  } else if (provider === 'gemini') {
    return callGemini(promptText);
  }

  throw new Error(`Unsupported VLM provider: ${provider}`);
}

function generateMockVlmResponse(contextPayload: Record<string, any>): string {
  const actions: Array<Record<string, any>> = [];

  if (contextPayload.fields && Array.isArray(contextPayload.fields)) {
    for (const field of contextPayload.fields) {
      if (field.ref && field.target) {
        actions.push({
          action: 'TYPE_REFERENCE',
          target: field.target,
          reference: field.ref
        });
      }
    }
  }

  if (contextPayload.button && contextPayload.button.target) {
    actions.push({
      action: 'CLICK',
      target: contextPayload.button.target
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
  const endpoint = config.vlmEndpoint || 'https://api.openai.com/v1/chat/completions';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.vlmApiKey}`
    },
    body: JSON.stringify({
      model: config.vlmModel || 'gpt-4o',
      messages: [
        { role: 'system', content: VLM_SYSTEM_PROMPT },
        { role: 'user', content: promptText }
      ],
      temperature: 0.1
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
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
    throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
  }

  const data: any = await response.json();
  return data.content?.[0]?.text || '';
}

async function callGemini(promptText: string): Promise<string> {
  const modelName = config.vlmModel || 'gemini-1.5-flash';
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
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
  }

  const data: any = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}
