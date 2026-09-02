import type { ProtectedElementType } from "../../../shared/types";
import type { CandidateDetection, UnifiedElement } from "../types";

const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
// International-ish phone matcher. Validation below prevents arbitrary digit runs.
const PHONE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,5}[\s.-]?\d{3,5}\b/g;
const CARD = /(?:\d[ -]*?){13,19}/g;
const OTP = /\b(?:otp|verification\s*code|one[-\s]?time\s*(?:password|code))\s*[:=-]?\s*\d{4,8}\b/i;

function luhn(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0, alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n; alt = !alt;
  }
  return sum % 10 === 0;
}

function confidence(type: ProtectedElementType): number {
  switch (type) {
    case "EMAIL": return 0.99;
    case "CREDIT_CARD": return 0.99;
    case "PHONE": return 0.9;
    case "PASSWORD": return 0.98;
    default: return 0.75;
  }
}

export function detectByRules(elements: UnifiedElement[]): CandidateDetection[] {
  const out: CandidateDetection[] = [];
  let counter = 0;
  const push = (el: UnifiedElement, type: ProtectedElementType, matchedText?: string, c = confidence(type), detectorName: CandidateDetection["detectorName"] = "regex") => {
    out.push({ id: `rule_${++counter}`, elementId: el.id, type, source: el.source, confidence: c, bbox: el.bbox, matchedText, detectorName });
  };

  for (const el of elements) {
    const field = el.domFieldType?.toLowerCase();
    const text = el.text ?? "";
    const label = el.label ?? "";

    // DOM semantics are stronger than regex for password inputs.
    if (field === "password") {
      push(el, "PASSWORD", text || undefined, 0.99, "dom-heuristic");
      continue;
    }

    if (field === "email" && text) push(el, "EMAIL", text, 0.99, "dom-heuristic");
    if (field === "tel" && text) push(el, "PHONE", text, 0.95, "dom-heuristic");

    const seen = new Set<string>();
    const addMatch = (type: ProtectedElementType, value: string, c?: number) => {
      const key = `${type}:${value}`;
      if (!seen.has(key)) { seen.add(key); push(el, type, value, c); }
    };

    for (const m of text.matchAll(EMAIL)) addMatch("EMAIL", m[0]);
    for (const m of text.matchAll(CARD)) if (luhn(m[0])) addMatch("CREDIT_CARD", m[0]);
    for (const m of text.matchAll(PHONE)) {
      const digits = m[0].replace(/\D/g, "");
      if (digits.length >= 7 && digits.length <= 15 && !luhn(m[0])) addMatch("PHONE", m[0].trim(), 0.9);
    }

    // OTP is treated as OTHER unless the shared contract adds a dedicated OTP type.
    // The detector intentionally does not pretend OTP is an email/phone/card.
    if (OTP.test(`${label}: ${text}`)) addMatch("OTHER", text || label, 0.9);
  }
  return out;
}
