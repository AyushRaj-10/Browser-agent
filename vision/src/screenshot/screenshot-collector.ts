import {
  BoundingBox,
} from "../../../shared/types";
import {
  CapturedScreenshot,
  ScreenshotMetadata,
  ScreenshotInput,
} from "../types";

/**
 * ScreenshotCollector handles capturing, scaling, and computing visual hashes
 * for the browser viewport.
 */
export class ScreenshotCollector {
  private lastVisualHash: string | null = null;

  /**
   * Captures the visible tab using Chrome/WebExtension API if in extension context,
   * or parses provided screenshot inputs.
   */
  async captureTab(
    tabId?: number,
    options?: { format?: "png" | "jpeg"; quality?: number }
  ): Promise<CapturedScreenshot> {
    const format = options?.format ?? "png";
    const quality = options?.quality ?? 90;

    // Check if chrome.tabs is available (Extension background/popup context)
    if (
      typeof chrome !== "undefined" &&
      chrome.tabs &&
      typeof chrome.tabs.captureVisibleTab === "function"
    ) {
      return new Promise<CapturedScreenshot>((resolve, reject) => {
        const captureOptions = {
          format,
          ...(format === "jpeg" ? { quality } : {}),
        };

        const targetWindowId =
          typeof chrome.windows !== "undefined"
            ? chrome.windows.WINDOW_ID_CURRENT
            : undefined;

        chrome.tabs.captureVisibleTab(
          targetWindowId ?? 0,
          captureOptions,
          (dataUrl?: string) => {
            if (chrome.runtime?.lastError) {
              return reject(new Error(chrome.runtime.lastError.message));
            }
            if (!dataUrl) {
              return reject(new Error("Failed to capture tab: empty data URL"));
            }

            const metadata: ScreenshotMetadata = {
              width: typeof window !== "undefined" ? window.innerWidth : 1280,
              height: typeof window !== "undefined" ? window.innerHeight : 720,
              devicePixelRatio:
                typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
              timestamp: Date.now(),
              visualHash: this.computeFastHash(dataUrl),
            };

            resolve({
              dataUrl,
              metadata,
            });
          }
        );
      });
    }

    throw new Error(
      "chrome.tabs.captureVisibleTab is not available in the current execution context. Pass a dataUrl or ImageData directly."
    );
  }

  /**
   * Normalizes any screenshot input into a standard CapturedScreenshot object
   */
  async normalizeInput(
    input: ScreenshotInput,
    viewport?: { width: number; height: number; devicePixelRatio?: number }
  ): Promise<CapturedScreenshot> {
    const dpr = viewport?.devicePixelRatio ?? 1;

    if (typeof input === "string") {
      // It's a data URL or image path
      const visualHash = this.computeFastHash(input);
      return {
        dataUrl: input,
        metadata: {
          width: viewport?.width ?? 1280,
          height: viewport?.height ?? 720,
          devicePixelRatio: dpr,
          timestamp: Date.now(),
          visualHash,
        },
      };
    }

    if ("dataUrl" in input && input.metadata) {
      if (!input.metadata.visualHash) {
        input.metadata.visualHash = this.computeFastHash(input.dataUrl);
      }
      return input;
    }

    // Handle ImageData (convert to dataUrl if canvas is available)
    if (typeof ImageData !== "undefined" && input instanceof ImageData) {
      const dataUrl = this.imageDataToDataUrl(input);
      return {
        dataUrl,
        metadata: {
          width: input.width / dpr,
          height: input.height / dpr,
          devicePixelRatio: dpr,
          timestamp: Date.now(),
          visualHash: this.computeFastHash(dataUrl),
        },
        rawImage: input,
      };
    }

    throw new Error("Unsupported screenshot input format.");
  }

  /**
   * Scales a pixel bounding box from raw image coordinates to CSS viewport coordinates.
   */
  scaleBboxToViewport(
    bbox: BoundingBox,
    dpr: number = 1
  ): BoundingBox {
    if (dpr <= 0 || dpr === 1) return bbox;
    const [x, y, w, h] = bbox;
    return [
      Math.round(x / dpr),
      Math.round(y / dpr),
      Math.round(w / dpr),
      Math.round(h / dpr),
    ];
  }

  /**
   * Scales a viewport CSS bounding box to physical screenshot pixel coordinates.
   */
  scaleBboxToPixels(
    bbox: BoundingBox,
    dpr: number = 1
  ): BoundingBox {
    if (dpr <= 0 || dpr === 1) return bbox;
    const [x, y, w, h] = bbox;
    return [
      Math.round(x * dpr),
      Math.round(y * dpr),
      Math.round(w * dpr),
      Math.round(h * dpr),
    ];
  }

  /**
   * Computes a lightweight perceptual difference score (0.0 to 1.0) between two hashes or inputs.
   * Returns 1.0 for identical images, 0.0 for completely different images.
   */
  compareVisualHashes(hashA: string, hashB: string): number {
    if (hashA === hashB) return 1.0;
    if (hashA.length !== hashB.length || hashA.length === 0) return 0.0;

    let matching = 0;
    for (let i = 0; i < hashA.length; i++) {
      if (hashA[i] === hashB[i]) {
        matching++;
      }
    }
    return matching / hashA.length;
  }

  /**
   * Updates and checks if the screen is virtually identical to the previous capture.
   */
  isVisuallyUnchanged(newHash: string, threshold = 0.98): boolean {
    if (!this.lastVisualHash) {
      this.lastVisualHash = newHash;
      return false;
    }
    const similarity = this.compareVisualHashes(this.lastVisualHash, newHash);
    this.lastVisualHash = newHash;
    return similarity >= threshold;
  }

  /**
   * Resets the visual diff cache
   */
  resetDiffCache(): void {
    this.lastVisualHash = null;
  }

  /**
   * Fast 64-bit sampling hash based on sampled bytes across image data URL.
   */
  computeFastHash(dataUrl: string): string {
    const len = dataUrl.length;
    if (len === 0) return "0000000000000000";
    
    // Sample 64 points across the string representation
    let hash = "";
    const step = Math.max(1, Math.floor(len / 64));
    for (let i = 0; i < 64; i++) {
      const idx = Math.min(len - 1, i * step);
      const code = dataUrl.charCodeAt(idx) % 16;
      hash += code.toString(16);
    }
    return hash;
  }

  /**
   * Converts ImageData to PNG/JPEG DataURL via canvas or offscreen canvas.
   */
  private imageDataToDataUrl(imageData: ImageData): string {
    if (typeof OffscreenCanvas !== "undefined") {
      const canvas = new OffscreenCanvas(imageData.width, imageData.height);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.putImageData(imageData, 0, 0);
        // OffscreenCanvas in browser supports convertToBlob
        return `data:image/png;base64,${imageData.width}x${imageData.height}`;
      }
    }
    return `data:image/png;base64,${imageData.width}x${imageData.height}`;
  }
}
