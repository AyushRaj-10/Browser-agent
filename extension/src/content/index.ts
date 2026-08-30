import browser from "webextension-polyfill";
import { analyzeDom } from "./domAnalyzer";
import type { AnalyzePageResponse, ExtensionMessage } from "../shared/messages";

// webextension-polyfill normalizes messaging to be promise-based: return
// the response directly instead of chrome's raw sendResponse callback.
browser.runtime.onMessage.addListener((message: ExtensionMessage) => {
  if (message.type === "ANALYZE_PAGE") {
    const analysis = analyzeDom();
    const response: AnalyzePageResponse = { type: "ANALYZE_PAGE_RESULT", analysis };
    return Promise.resolve(response);
  }
  return undefined;
});
