import browser from "webextension-polyfill";

import {
  analyzeDom,
  clearElementHighlight,
  highlightElement,
} from "./domAnalyzer";

import type {
  AnalyzePageResponse,
  ExtensionMessage,
} from "../shared/messages";

// webextension-polyfill normalizes messaging to be promise-based:
// return the response directly instead of Chrome's raw sendResponse callback.
browser.runtime.onMessage.addListener(
  (message: ExtensionMessage) => {
    if (message.type === "ANALYZE_PAGE") {
      const analysis = analyzeDom();

      const response: AnalyzePageResponse = {
        type: "ANALYZE_PAGE_RESULT",
        analysis,
      };

      return Promise.resolve(response);
    }

    if (message.type === "HIGHLIGHT_ELEMENT") {
      highlightElement(message.elementId);
      return Promise.resolve();
    }

    if (message.type === "CLEAR_HIGHLIGHT") {
      clearElementHighlight();
      return Promise.resolve();
    }

    return undefined;
  }
);