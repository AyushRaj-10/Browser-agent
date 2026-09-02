import type {
  AnalyzedField,
  FieldType,
  PageAnalysis,
} from "../shared/messages";

const SENSITIVE_INPUT_TYPES = new Set([
  "password",
  "email",
  "tel",
]);

const SENSITIVE_NAME_PATTERNS = [
  /pass(word)?/i,
  /pwd/i,
  /ssn|aadhaar|pan\b/i,
  /credit.?card|card.?number|cvv|cvc/i,
  /e-?mail/i,
  /phone|mobile|tel(ephone)?/i,
  /dob|birth/i,
  /address/i,
  /otp|token|secret|api.?key/i,
];

type InteractiveElement =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement
  | HTMLButtonElement
  | HTMLAnchorElement;

/**
 * Maps analysis IDs to the exact DOM elements that produced them.
 *
 * The map is rebuilt whenever analyzeDom() runs, so generated IDs only
 * need to remain stable for the lifetime of the current analysis.
 */
const analyzedElements = new Map<string, InteractiveElement>();

/**
 * Temporary visual overlay used to show which webpage element
 * corresponds to a Page Perception card in the extension popup.
 */
let highlightOverlay: HTMLDivElement | null = null;

function mapElementType(el: InteractiveElement): FieldType {
  if (el instanceof HTMLTextAreaElement) return "textarea";
  if (el instanceof HTMLSelectElement) return "select";
  if (el instanceof HTMLButtonElement) return "button";
  if (el instanceof HTMLAnchorElement) return "link";

  if (el instanceof HTMLInputElement) {
    const type = el.type.toLowerCase();

    const supportedTypes: FieldType[] = [
      "text",
      "password",
      "email",
      "tel",
      "number",
      "url",
      "search",
      "date",
      "time",
      "datetime-local",
      "month",
      "week",
      "file",
      "color",
      "range",
      "checkbox",
      "radio",
    ];

    if (
      type === "button" ||
      type === "submit" ||
      type === "reset"
    ) {
      return "button";
    }

    if (supportedTypes.includes(type as FieldType)) {
      return type as FieldType;
    }

    return "other";
  }

  return "other";
}

function getCleanLabelText(
  label: Element,
): string | null {
  const clone = label.cloneNode(true) as HTMLElement;

  clone
    .querySelectorAll("input, textarea, select, button")
    .forEach((node) => node.remove());

  const text = clone.textContent
    ?.replace(/\s+/g, " ")
    .trim();

  return text || null;
}

function findLabelText(el: HTMLElement): string | null {
  // 1. aria-label
  const ariaLabel = el.getAttribute("aria-label");

  if (ariaLabel?.trim()) {
    return ariaLabel.trim();
  }

  // 2. aria-labelledby
  const labelledBy = el.getAttribute("aria-labelledby");

  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map(
        (id) =>
          document.getElementById(id)?.textContent?.trim()
      )
      .filter(Boolean)
      .join(" ");

    if (text) {
      return text;
    }
  }

  // 3. Explicit <label for="element-id">
  const id = el.getAttribute("id");

  if (id) {
    const byFor = document.querySelector(
      `label[for="${CSS.escape(id)}"]`
    );

    if (byFor) {
      const text = getCleanLabelText(byFor);

      if (text) {
        return text;
      }
    }
  }

  // 4. Element nested inside a <label>
  const parentLabel = el.closest("label");

  if (parentLabel) {
    const text = getCleanLabelText(parentLabel);

    if (text) {
      return text;
    }
  }

  // 5. Placeholder fallback
  const placeholder = el.getAttribute("placeholder");

  if (placeholder?.trim()) {
    return placeholder.trim();
  }

  // 6. Buttons and links can describe themselves
  if (
    el instanceof HTMLButtonElement ||
    el instanceof HTMLAnchorElement
  ) {
    const text = el.textContent?.trim();

    if (text) {
      return text.slice(0, 100);
    }
  }

  return null;
}

function isVisible(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0"
  );
}

function getBoundingBox(el: HTMLElement) {
  const rect = el.getBoundingClientRect();

  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

function isLikelySensitive(
  el: InteractiveElement,
  label: string | null
): boolean {
  if (el instanceof HTMLInputElement) {
    const type = el.type.toLowerCase();

    if (SENSITIVE_INPUT_TYPES.has(type)) {
      return true;
    }
  }

  const haystack = [
    el.getAttribute("name"),
    el.getAttribute("id"),
    el.getAttribute("placeholder"),
    el.getAttribute("aria-label"),
    label,
  ]
    .filter(Boolean)
    .join(" ");

  return SENSITIVE_NAME_PATTERNS.some((pattern) =>
    pattern.test(haystack)
  );
}

function getSafeValue(
  el: InteractiveElement,
  sensitive: boolean
): string | null {
  if (sensitive) {
    return null;
  }

  if (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  ) {
    return el.value?.slice(0, 40) || null;
  }

  return null;
}

/**
 * Removes the current browser-agent highlight overlay.
 */
export function clearElementHighlight(): void {
  highlightOverlay?.remove();
  highlightOverlay = null;
}

/**
 * Visually highlights the DOM element associated with an analysis ID.
 *
 * An overlay is used instead of mutating the target element's own CSS,
 * so the extension does not overwrite the website's existing styles.
 */
export function highlightElement(elementId: string): void {
  clearElementHighlight();

  const element = analyzedElements.get(elementId);

  if (!element || !element.isConnected) {
    return;
  }

  const rect = element.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) {
    return;
  }

  const overlay = document.createElement("div");

  overlay.setAttribute(
    "data-browser-agent-highlight",
    "true"
  );

  Object.assign(overlay.style, {
    position: "fixed",
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    boxSizing: "border-box",
    border: "2px solid #6366f1",
    borderRadius: "4px",
    background: "rgba(99, 102, 241, 0.10)",
    boxShadow: "0 0 0 2px rgba(99, 102, 241, 0.15)",
    pointerEvents: "none",
    zIndex: "2147483647",
  });

  document.documentElement.appendChild(overlay);
  highlightOverlay = overlay;
}

/**
 * Scans the current webpage and converts interactive DOM elements
 * into structured information for the browser-agent pipeline.
 */
export function analyzeDom(): PageAnalysis {
  // A new analysis replaces the previous element registry.
  clearElementHighlight();
  analyzedElements.clear();

  const elements = Array.from(
    document.querySelectorAll<InteractiveElement>(
      "input, textarea, select, button, a[href]"
    )
  ).filter((el) => {
    if (
      el instanceof HTMLInputElement &&
      el.type.toLowerCase() === "hidden"
    ) {
      return false;
    }

    return true;
  });

  const fields: AnalyzedField[] = elements.map(
    (el, index) => {
      const label = findLabelText(el);
      const sensitive = isLikelySensitive(el, label);
      const type = mapElementType(el);

      /*
       * Use the page's existing ID when available.
       * Otherwise generate an analysis-local identifier.
       *
       * The identifier does NOT need to be a CSS selector because
       * analyzedElements stores the direct DOM reference.
       */
      const analysisId =
        el.id || `agent-element-${index}`;

      analyzedElements.set(analysisId, el);

      let checked: boolean | null = null;

      if (
        el instanceof HTMLInputElement &&
        (el.type === "checkbox" ||
          el.type === "radio")
      ) {
        checked = el.checked;
      }

      const text =
        el instanceof HTMLButtonElement ||
        el instanceof HTMLAnchorElement
          ? el.textContent?.trim().slice(0, 100) || null
          : null;

      const required =
        "required" in el
          ? Boolean(el.required)
          : false;

      const disabled =
        "disabled" in el
          ? Boolean(el.disabled)
          : false;

      return {
        id: analysisId,
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute("role"),
        name: el.getAttribute("name"),
        label,
        type,
        text,
        placeholder: el.getAttribute("placeholder"),
        required,
        disabled,
        visible: isVisible(el),
        checked,
        bbox: getBoundingBox(el),
        sensitive,
        sampleValue: getSafeValue(el, sensitive),
      };
    }
  );

  return {
    url: location.href,
    title: document.title,
    fields,
    analyzedAt: Date.now(),
  };
}

/**
 * Returns the live DOM element for a given analysis ID or CSS/ID selector.
 */
export function getAnalyzedElement(id: string): InteractiveElement | HTMLElement | null {
  const fromMap = analyzedElements.get(id);
  if (fromMap && fromMap.isConnected) {
    return fromMap;
  }

  // Fallback direct DOM search by ID
  const byId = document.getElementById(id);
  if (byId) return byId;

  // Fallback by ID selector
  try {
    const byIdSelector = document.querySelector<HTMLElement>(`#${id}`);
    if (byIdSelector) return byIdSelector;
  } catch {}

  // Fallback by Name attribute
  try {
    const byName = document.querySelector<HTMLElement>(`[name="${id}"]`);
    if (byName) return byName;
  } catch {}

  try {
    const byQuery = document.querySelector<HTMLElement>(id);
    if (byQuery) return byQuery;
  } catch {}

  return null;
}