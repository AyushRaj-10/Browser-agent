import browser from "webextension-polyfill";
import type {
  AnalyzePageResponse,
  AskAIRequest,
  AskAIResult,
  ExtensionMessage,
  PageAnalysis,
  UserProtectedFieldIds,
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

  if (tab?.id === undefined) {
    throw new Error("No active tab found");
  }

  return tab.id;
}

/**
 * Forwards a popup message to the content script running in
 * the currently active tab.
 *
 * Highlighting is performed by the content script because it has
 * direct access to the webpage DOM.
 */
async function forwardToActiveTab(
  message: ExtensionMessage
): Promise<void> {
  const tabId = await getActiveTabId();

  await browser.tabs.sendMessage(tabId, message);
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
 * A field is effectively protected when:
 *
 *   1. It was automatically classified as sensitive, OR
 *   2. The user explicitly chose to protect it.
 *
 * Automatic protection can only be strengthened by the user.
 * It cannot be disabled through user protection preferences.
 *
 * This is currently the extension-side fallback enforcement point.
 * During integration, the dedicated privacy component should become
 * the authoritative privacy/redaction layer.
 */
function buildSanitizedPayload(
  task: string,
  analysis: PageAnalysis,
  userProtectedFieldIds: UserProtectedFieldIds
) {
  const userProtectedSet = new Set(userProtectedFieldIds);

  const sanitizedFields = analysis.fields.map((field) => {
    const effectivelyProtected =
      field.sensitive || userProtectedSet.has(field.id);

    if (effectivelyProtected) {
      return {
        id: field.id,
        type: field.type,
        label: field.label,
        sensitive: true,
      };
    }

    return {
      id: field.id,
      type: field.type,
      label: field.label,
      sensitive: false,
      sampleValue: field.sampleValue,
    };
  });

  const sensitiveItemsProtected = analysis.fields.filter(
    (field) =>
      field.sensitive || userProtectedSet.has(field.id)
  ).length;

  // Raw values belonging to effectively protected fields are never
  // included in the outgoing payload.
  //
  // This remains zero because the extension never sends raw values
  // for anything it considers protected.
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

async function handleAskAI(
  task: string,
  userProtectedFieldIds: UserProtectedFieldIds = []
): Promise<AskAIResult> {
  try {
    const { tabId, analysis } = await analyzeActivePage();

    const {
      payload,
      sensitiveItemsProtected,
      rawItemsSent,
    } = buildSanitizedPayload(
      task,
      analysis,
      userProtectedFieldIds
    );

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
      userProtectedFieldIds,
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
      userProtectedFieldIds,
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

      return handleAskAI(
        request.task,
        request.userProtectedFieldIds ?? []
      );
    }

    /**
     * The popup cannot directly access the webpage DOM.
     * Forward highlight commands to the active tab's content script.
     */
    if (message.type === "HIGHLIGHT_ELEMENT") {
      return forwardToActiveTab(message);
    }

    if (message.type === "CLEAR_HIGHLIGHT") {
      return forwardToActiveTab(message);
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