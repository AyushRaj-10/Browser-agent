import browser from "webextension-polyfill";

import {
  analyzeDom,
  clearElementHighlight,
  highlightElement,
} from "./domAnalyzer";

import { executeDomAction } from "./executor";

import type {
  AnalyzePageResponse,
  ExecuteActionRequest,
  ExecuteActionResponse,
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

    if (message.type === "EXECUTE_ACTION") {
      const execMsg = message as ExecuteActionRequest;
      return executeDomAction({
        action: execMsg.action,
        target: execMsg.target,
        value: execMsg.value,
      }).then((result): ExecuteActionResponse => ({
        type: "EXECUTE_ACTION_RESULT",
        success: result.success,
        action: result.action,
        target: result.target,
        error: result.error,
      }));
    }

    return undefined;
  }
);