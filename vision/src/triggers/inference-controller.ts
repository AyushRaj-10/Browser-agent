import { TriggerOptions, TriggerEventType } from "../types";
import { DEFAULT_THRESHOLDS } from "../../../shared/constants";

export type InferenceCallback<T> = (signal: AbortSignal) => Promise<T>;

/**
 * InferenceTriggerController manages event-driven execution of vision & OCR inference,
 * enforcing debouncing, visual diff suppression, and stale run cancellation.
 */
export class InferenceTriggerController {
  private debounceMs: number;
  private minSimilarityToSkip: number;
  private enableDiffCheck: boolean;

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private currentAbortController: AbortController | null = null;
  private isRunning = false;
  private lastTriggerTime = 0;
  private triggerCount = 0;

  constructor(options?: TriggerOptions) {
    this.debounceMs = options?.debounceMs ?? DEFAULT_THRESHOLDS.DEBOUNCE_INFERENCE_MS;
    this.minSimilarityToSkip =
      options?.minSimilarityThresholdToSkip ?? DEFAULT_THRESHOLDS.VISUAL_DIFF_SIMILARITY_THRESHOLD;
    this.enableDiffCheck = options?.enableVisualDiffCheck ?? true;
  }

  /**
   * Triggers inference on explicit Task Start (immediate, high priority, cancels any pending debounce).
   */
  async triggerTaskStart<T>(callback: InferenceCallback<T>): Promise<T> {
    return this.executeImmediate("TASK_START", callback);
  }

  /**
   * Triggers inference on DOM Mutation or Scroll event (debounced).
   */
  triggerDebounced<T>(
    eventType: TriggerEventType,
    callback: InferenceCallback<T>,
    customDebounceMs?: number
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      const wait = customDebounceMs ?? this.debounceMs;

      this.debounceTimer = setTimeout(async () => {
        try {
          const result = await this.executeImmediate(eventType, callback);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      }, wait);
    });
  }

  /**
   * Executes the inference callback immediately with an AbortSignal, cancelling any stale run.
   */
  async executeImmediate<T>(
    eventType: TriggerEventType,
    callback: InferenceCallback<T>
  ): Promise<T> {
    // 1. Cancel any active debounce
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    // 2. Abort previous running inference if still in-flight
    if (this.isRunning && this.currentAbortController) {
      this.currentAbortController.abort();
    }

    // 3. Create fresh AbortController
    this.currentAbortController = new AbortController();
    const signal = this.currentAbortController.signal;

    this.isRunning = true;
    this.lastTriggerTime = Date.now();
    this.triggerCount++;

    try {
      const result = await callback(signal);
      return result;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Cancels any pending debounced or in-flight inference.
   */
  cancel(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
    this.isRunning = false;
  }

  /**
   * Returns current controller metrics
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      triggerCount: this.triggerCount,
      lastTriggerTime: this.lastTriggerTime,
      debounceMs: this.debounceMs,
      diffCheckEnabled: this.enableDiffCheck,
      minSimilarityToSkip: this.minSimilarityToSkip,
    };
  }
}
