/**
 * Browser DOM Action Executor (Person 6 & Person 1 Scope)
 * Executes validated and resolved browser actions directly against the live webpage DOM.
 */

import { getAnalyzedElement } from "./domAnalyzer";

export interface DomActionPayload {
  action: "CLICK" | "SCROLL" | "TYPE" | "SELECT" | "WAIT";
  target: string;
  value?: string;
}

export interface DomExecutionResult {
  success: boolean;
  action: string;
  target: string;
  error?: string;
}

/**
 * Dispatches simulated user input events so frameworks (React, Vue, Angular) detect changes.
 */
function triggerInputEvents(element: HTMLElement, newValue: string): void {
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
  ) {
    // React value tracker override
    const valueSetter = Object.getOwnPropertyDescriptor(
      element instanceof HTMLInputElement
        ? HTMLInputElement.prototype
        : HTMLTextAreaElement.prototype,
      "value"
    )?.set;

    if (valueSetter) {
      valueSetter.call(element, newValue);
    } else {
      element.value = newValue;
    }

    element.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
  }
}

/**
 * Executes a single approved action against the live DOM.
 */
export async function executeDomAction(
  payload: DomActionPayload
): Promise<DomExecutionResult> {
  const { action, target, value } = payload;
  const verb = action.toUpperCase();

  if (verb === "WAIT") {
    const delayMs = parseInt(value || "1000", 10);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return { success: true, action: verb, target };
  }

  const element = getAnalyzedElement(target);

  if (!element || !element.isConnected) {
    return {
      success: false,
      action: verb,
      target,
      error: `DOM element '${target}' not found or disconnected from document.`,
    };
  }

  try {
    element.scrollIntoView({ behavior: "smooth", block: "center" });

    switch (verb) {
      case "CLICK": {
        element.focus();
        element.dispatchEvent(
          new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window })
        );
        element.dispatchEvent(
          new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window })
        );
        element.click();
        return { success: true, action: verb, target };
      }

      case "TYPE": {
        element.focus();
        const textToType = value || "";
        triggerInputEvents(element, textToType);
        return { success: true, action: verb, target };
      }

      case "SELECT": {
        if (element instanceof HTMLSelectElement) {
          element.focus();
          if (value) {
            element.value = value;
          }
          element.dispatchEvent(new Event("change", { bubbles: true }));
          return { success: true, action: verb, target };
        }
        return {
          success: false,
          action: verb,
          target,
          error: `Target element '${target}' is not an HTMLSelectElement.`,
        };
      }

      case "SCROLL": {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        return { success: true, action: verb, target };
      }

      default: {
        return {
          success: false,
          action: verb,
          target,
          error: `Unsupported action type: ${action}`,
        };
      }
    }
  } catch (error) {
    return {
      success: false,
      action: verb,
      target,
      error: error instanceof Error ? error.message : "DOM execution error",
    };
  }
}
