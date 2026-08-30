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

/**
 * Store analysis separately for each browser tab.
 *
 * This allows analysis to survive popup close/reopen while preventing
 * results from one tab from appearing in another tab.
 */
function getStorageKey(tabId: number): string {
  return `browserAgent.lastResult.${tabId}`;
}

async function getActiveTabId(): Promise<number> {
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!tab?.id) {
    throw new Error("No active tab found");
  }

  return tab.id;
}

/**
 * Ask the content script running in the active tab to analyze the page.
 *
 * The tab ID is returned alongside the analysis so that the result can
 * be associated with the exact tab that produced it.
 */
async function analyzeActivePage(): Promise<{
  tabId: number;
  analysis: PageAnalysis;
}> {
  const tabId = await getActiveTabId();

  const response = (await browser.tabs.sendMessage(tabId, {
    type: "ANALYZE_PAGE",
  })) as AnalyzePageResponse;

  return {
    tabId,
    analysis: response.analysis,
  };
}

/**
 * Builds the payload that is allowed to leave the browser.
 *
 * Sensitive fields are reduced to structural information only and never
 * include their raw value.
 *
 * This is currently the extension-side fallback enforcement point.
 * During integration, the dedicated privacy component should become the
 * authoritative privacy/redaction layer.
 */
function buildSanitizedPayload(task: string, analysis: PageAnalysis) {
  const sanitizedFields = analysis.fields.map((field) =>
    field.sensitive
      ? {
          id: field.id,
          type: field.type,
          label: field.label,
          sensitive: true,
        }
      : {
          id: field.id,
          type: field.type,
          label: field.label,
          sensitive: false,
          sampleValue: field.sampleValue,
        }
  );

  const sensitiveItemsProtected = analysis.fields.filter(
    (field) => field.sensitive
  ).length;

  // Raw values belonging to fields classified as sensitive are never
  // included in the outgoing payload.
  const rawItemsSent = 0;

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
    const { tabId, analysis } = await analyzeActivePage();

    const {
      payload,
      sensitiveItemsProtected,
      rawItemsSent,
    } = buildSanitizedPayload(task, analysis);

    let serverInstruction: string | null = null;

    try {
      const response = await fetch(BACKEND_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        serverInstruction = data?.instruction ?? null;
      }
    } catch {
      // Backend may not be running during standalone extension development.
      // This is expected until full team integration.
      serverInstruction = null;
    }

    const result: AskAIResult = {
      type: "ASK_AI_RESULT",
      sensitiveItemsProtected,
      rawItemsSent,
      analysis,
      serverInstruction,
    };

    // Persist the result for this tab so closing/reopening the popup does
    // not immediately discard the analysis.
    await browser.storage.local.set({
      [getStorageKey(tabId)]: result,
    });

    return result;
  } catch (error) {
    // Error results are returned to the popup but intentionally not
    // persisted. Reopening the popup therefore starts clean after a failure.
    const result: AskAIResult = {
      type: "ASK_AI_RESULT",
      sensitiveItemsProtected: 0,
      rawItemsSent: 0,
      analysis: null,
      serverInstruction: null,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error",
    };

    return result;
  }
}

// webextension-polyfill normalizes messaging to be promise-based.
browser.runtime.onMessage.addListener(
  (message: ExtensionMessage) => {
    if (message.type === "ASK_AI") {
      const request = message as AskAIRequest;
      return handleAskAI(request.task);
    }

    return undefined;
  }
);

/**
 * A reload or navigation creates a new document in the tab.
 *
 * Remove only that tab's cached analysis so stale results from the
 * previous document are never displayed.
 */
browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    void browser.storage.local.remove(getStorageKey(tabId));
  }
});

/**
 * Remove cached data when a tab is permanently closed.
 */
browser.tabs.onRemoved.addListener((tabId) => {
  void browser.storage.local.remove(getStorageKey(tabId));
});