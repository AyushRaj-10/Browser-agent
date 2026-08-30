import type {
  AnalyzedField,
  FieldType,
  PageAnalysis,
} from "../shared/messages";

const SENSITIVE_INPUT_TYPES = new Set(["password", "email", "tel"]);

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
 * Maps a DOM element to the simplified element type used by
 * the browser-agent pipeline.
 */
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

/**
 * Attempts to determine a useful human-readable label
 * for an interactive element.
 */
function getCleanLabelText(
  label: Element,
  control?: HTMLElement
): string | null {
  const clone = label.cloneNode(true) as HTMLElement;

  // Remove the actual form control from the cloned label so its
  // option/value text doesn't contaminate the human-readable label.
  if (control) {
    clone.querySelectorAll(
      "input, textarea, select, button"
    ).forEach((node) => node.remove());
  } else {
    clone.querySelectorAll(
      "input, textarea, select, button"
    ).forEach((node) => node.remove());
  }

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
      .map((id) => document.getElementById(id)?.textContent?.trim())
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
    const text = getCleanLabelText(parentLabel, el);

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

/**
 * Determines whether the element is currently visually rendered.
 */
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

/**
 * Returns viewport-relative coordinates for DOM ↔ vision alignment.
 */
function getBoundingBox(el: HTMLElement) {
  const rect = el.getBoundingClientRect();

  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

/**
 * Temporary lightweight privacy heuristic.
 *
 * Person 1 exposes structural DOM information. The dedicated privacy
 * component can replace or extend this during team integration.
 */
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

/**
 * Returns a field value only when the element has NOT been
 * classified as sensitive.
 */
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
 * Scans the current webpage and converts interactive DOM elements
 * into structured information for the browser-agent pipeline.
 */
export function analyzeDom(): PageAnalysis {
  const elements = Array.from(
    document.querySelectorAll<InteractiveElement>(
      "input, textarea, select, button, a[href]"
    )
  ).filter((el) => {
    // Hidden inputs aren't useful for visual browser perception.
    if (
      el instanceof HTMLInputElement &&
      el.type.toLowerCase() === "hidden"
    ) {
      return false;
    }

    return true;
  });

  const fields: AnalyzedField[] = elements.map((el, index) => {
    const label = findLabelText(el);
    const sensitive = isLikelySensitive(el, label);
    const type = mapElementType(el);

    let checked: boolean | null = null;

    if (
      el instanceof HTMLInputElement &&
      (el.type === "checkbox" || el.type === "radio")
    ) {
      checked = el.checked;
    }

    const text =
      el instanceof HTMLButtonElement ||
      el instanceof HTMLAnchorElement
        ? el.textContent?.trim().slice(0, 100) || null
        : null;

    const required =
      "required" in el ? Boolean(el.required) : false;

    const disabled =
      "disabled" in el ? Boolean(el.disabled) : false;

    return {
      id: el.id || `agent-element-${index}`,
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
  });

  return {
    url: location.href,
    title: document.title,
    fields,
    analyzedAt: Date.now(),
  };
}