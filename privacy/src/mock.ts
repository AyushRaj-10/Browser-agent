/**
 * Mock inputs/outputs for Part 3, mirroring the pattern vision/src/mock.ts
 * already uses for P2 -> P3. Lets P5 build/test the backend against a real
 * SanitizedContext shape without waiting on P1's DOM analyzer or P3's own
 * detection stage (Part 2) to be finished.
 */

import { UnifiedElement, CandidateDetection } from "./types";
import { sanitize } from "./sanitize";
import { SanitizedContext } from "../../shared/types";

export function createMockUnifiedElements(): UnifiedElement[] {
  return [
    { id: "el_name", source: "DOM", domFieldType: "text", label: "Full name", text: "Ayush Sharma" },
    { id: "el_email", source: "DOM", domFieldType: "email", label: "Email", text: "ayush@gmail.com" },
    { id: "el_phone", source: "DOM", domFieldType: "tel", label: "Phone", text: "+91 98765 43210" },
    { id: "el_password", source: "DOM", domFieldType: "password", label: "Password", text: "hunter2" },
    { id: "el_card", source: "OCR", label: undefined, text: "4111 1111 1111 1234" },
    { id: "el_photo", source: "VISION", label: undefined, text: undefined },
    { id: "el_submit", source: "DOM", domFieldType: "button", label: "Submit", text: "Submit" },
  ];
}

export function createMockDetections(): CandidateDetection[] {
  return [
    { id: "d1", elementId: "el_name", type: "PERSON", source: "DOM", confidence: 0.82, matchedText: "Ayush Sharma", detectorName: "ner" },
    { id: "d2", elementId: "el_email", type: "EMAIL", source: "DOM", confidence: 0.99, matchedText: "ayush@gmail.com", detectorName: "regex" },
    { id: "d3", elementId: "el_phone", type: "PHONE", source: "DOM", confidence: 0.95, matchedText: "+91 98765 43210", detectorName: "regex" },
    { id: "d4", elementId: "el_password", type: "PASSWORD", source: "DOM", confidence: 1.0, detectorName: "dom-heuristic" },
    { id: "d5", elementId: "el_card", type: "CREDIT_CARD", source: "OCR", confidence: 0.9, matchedText: "4111111111111234", detectorName: "regex" },
    { id: "d6", elementId: "el_photo", type: "FACE", source: "VISION", confidence: 0.4, detectorName: "vision-model" }, // deliberately low-confidence
  ];
}

export function createMockSanitizedContext(task = "Fill out and submit the profile form"): SanitizedContext {
  return sanitize({
    task,
    pageUrl: "https://example.com/profile",
    pageTitle: "Profile settings",
    elements: createMockUnifiedElements(),
    detections: createMockDetections(),
  });
}
