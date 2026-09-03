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
 * Dispatches simulated user input events so frameworks (React, Vue, Angular) and native forms detect changes.
 */
function triggerInputEvents(element: HTMLElement, newValue: string): void {
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
  ) {
    element.focus();

    // Standard native prototype setter
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

    element.setAttribute("value", newValue);

    try {
      element.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          cancelable: true,
          data: newValue,
          inputType: "insertText",
        })
      );
    } catch {
      element.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    }

    element.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
    element.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true }));
    element.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event("blur", { bubbles: true }));
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

  let element = getAnalyzedElement(target);

  // Resilient fallback: If dynamic page ID changed, lookup by input/button semantics
  if (!element || !element.isConnected) {
    if (verb === "TYPE") {
      const targetLower = target.toLowerCase();
      if (targetLower.includes("password") || targetLower.includes("pass") || targetLower.includes("pwd")) {
        element = document.querySelector<HTMLElement>(
          "input[type='password'], input[name*='password'], input[id*='password'], input[placeholder*='password']"
        );
      } else if (targetLower.includes("email") || targetLower.includes("user") || targetLower.includes("identifier") || targetLower.includes("login")) {
        element = document.querySelector<HTMLElement>(
          "input[type='email'], input[name='identifier'], #identifierId, input[name*='email'], input[placeholder*='email']"
        );
      } else {
        element = document.querySelector<HTMLElement>(
          "input:not([type='hidden']):not([disabled])"
        );
      }
    } else if (verb === "CLICK") {
      element = document.querySelector<HTMLElement>(
        "button[type='submit'], button.btn-submit, #identifierNext button, #identifierNext, [role='button'][id*='Next'], button:not([disabled])"
      );
    }
  }



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

        if (element instanceof HTMLInputElement && element.type === "checkbox") {
          element.checked = true;
          element.dispatchEvent(new Event("input", { bubbles: true }));
          element.dispatchEvent(new Event("change", { bubbles: true }));
          return { success: true, action: verb, target };
        }

        try {
          element.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, view: window }));
        } catch {}
        element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
        try {
          element.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true, view: window }));
        } catch {}
        element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }));
        element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
        element.click();

        const form = element.closest("form");
        if (form && (element.getAttribute("type") === "submit" || element.id.includes("submit") || element.id.includes("btn") || element.classList.contains("btn-submit"))) {
          try {
            if (typeof form.requestSubmit === "function") {
              form.requestSubmit(element instanceof HTMLButtonElement ? element : undefined);
            } else {
              form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
            }
          } catch {
            form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
          }
        }

        return { success: true, action: verb, target };
      }

      case "TYPE": {
        element.focus();
        const textToType = value || "";

        if (element instanceof HTMLSelectElement) {
          element.value = textToType;
          if (element.selectedIndex <= 0 && element.options.length > 1) {
            const valLower = textToType.toLowerCase().trim();
            for (let i = 0; i < element.options.length; i++) {
              const opt = element.options[i];
              if (
                opt.value.toLowerCase() === valLower ||
                opt.text.toLowerCase().includes(valLower) ||
                valLower.includes(opt.text.toLowerCase())
              ) {
                element.selectedIndex = i;
                break;
              }
            }
          }
          element.dispatchEvent(new Event("input", { bubbles: true }));
          element.dispatchEvent(new Event("change", { bubbles: true }));
          return { success: true, action: verb, target };
        }

        triggerInputEvents(element, textToType);
        return { success: true, action: verb, target };
      }

      case "SELECT": {
        if (element instanceof HTMLSelectElement) {
          element.focus();
          if (value) {
            element.value = value;
            if (element.selectedIndex <= 0 && element.options.length > 1) {
              const valLower = value.toLowerCase().trim();
              for (let i = 0; i < element.options.length; i++) {
                const opt = element.options[i];
                if (
                  opt.value.toLowerCase() === valLower ||
                  opt.text.toLowerCase().includes(valLower) ||
                  valLower.includes(opt.text.toLowerCase())
                ) {
                  element.selectedIndex = i;
                  break;
                }
              }
            }
          }
          element.dispatchEvent(new Event("input", { bubbles: true }));
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
