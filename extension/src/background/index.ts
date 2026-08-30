import browser from "webextension-polyfill";
import type {
  AnalyzePageResponse,
  AskAIRequest,
  AskAIResult,
  ExtensionMessage,
  PageAnalysis,
} from "../shared/messages";

// TODO: point this at whatever the backend branch exposes once merged
// (see the `backend` branch / Person handling Server Side Integration).
const BACKEND_URL = "http://localhost:8787/api/agent/task";

const STORAGE_KEY = "browserAgent.lastResult";

async function getActiveTabId(): Promise<number> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab found");
  return tab.id;
}

async function analyzeActivePage(): Promise<PageAnalysis> {
  const tabId = await getActiveTabId();
  const response = (await browser.tabs.sendMessage(tabId, {
    type: "ANALYZE_PAGE",
  })) as AnalyzePageResponse;
  return response.analysis;
}

/**
 * Builds the payload that is allowed to leave the browser: sensitive fields
 * are reduced to {sensitive: true, type, label} with no value at all.
 * This is the enforcement point for "only anonymized data is transmitted".
 */
function buildSanitizedPayload(task: string, analysis: PageAnalysis) {
  const sanitizedFields = analysis.fields.map((f) =>
    f.sensitive
      ? { id: f.id, type: f.type, label: f.label, sensitive: true }
      : { id: f.id, type: f.type, label: f.label, sensitive: false, sampleValue: f.sampleValue }
  );

  const sensitiveItemsProtected = analysis.fields.filter((f) => f.sensitive).length;
  const rawItemsSent = 0; // raw values for sensitive fields are never included, by construction

  return {
    payload: {
      task,
      url: analysis.url,
      title: analysis.title,
      fields: sanitizedFields,
    },
    sensitiveItemsProtected,
    rawItemsSent,
  };
}

async function handleAskAI(task: string): Promise<AskAIResult> {
  try {
    const analysis = await analyzeActivePage();
    const { payload, sensitiveItemsProtected, rawItemsSent } = buildSanitizedPayload(task, analysis);

    let serverInstruction: string | null = null;
    try {
      const res = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        serverInstruction = data?.instruction ?? null;
      }
    } catch {
      // Backend not up yet during solo dev — this is expected until integration.
      serverInstruction = null;
    }

    const result: AskAIResult = {
  type: "ASK_AI_RESULT",
  sensitiveItemsProtected,
  rawItemsSent,
  analysis,
  serverInstruction,
};

    await browser.storage.local.set({ [STORAGE_KEY]: result });
    return result;
  } catch (err) {
const result: AskAIResult = {
  type: "ASK_AI_RESULT",
  sensitiveItemsProtected: 0,
  rawItemsSent: 0,
  analysis: null,
  serverInstruction: null,
  error: err instanceof Error ? err.message : "Unknown error",
};
    await browser.storage.local.set({ [STORAGE_KEY]: result });
    return result;
  }
}

// webextension-polyfill normalizes messaging to be promise-based: return
// the response directly instead of chrome's raw sendResponse callback.
browser.runtime.onMessage.addListener((message: ExtensionMessage) => {
  if (message.type === "ASK_AI") {
    const req = message as AskAIRequest;
    return handleAskAI(req.task);
  }
  return undefined;
});
