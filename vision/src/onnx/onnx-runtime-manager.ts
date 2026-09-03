import * as ort from "onnxruntime-web";
import { BoundingBox } from "../../../shared/types";
import { ExecutionProvider } from "../types";

export interface PreprocessedTensorResult {
  tensor: ort.Tensor;
  originalWidth: number;
  originalHeight: number;
  scaleX: number;
  scaleY: number;
  padX: number;
  padY: number;
}

export interface RawBoxPrediction {
  bbox: BoundingBox;
  confidence: number;
  classId: number;
  label: string;
}

/**
 * OnnxRuntimeManager manages ONNX Web sessions, hardware acceleration providers,
 * tensor preprocessing, and NMS post-processing.
 */
export class OnnxRuntimeManager {
  private session: ort.InferenceSession | null = null;
  private currentProvider: ExecutionProvider = "mock";
  private modelPath: string | null = null;

  /**
   * Detects the best available hardware execution provider.
   */
  async detectBestProvider(preferred?: "webgpu" | "wasm" | "cpu"): Promise<ExecutionProvider> {
    if (preferred === "cpu") return "cpu";

    // 1. Check WebGPU availability
    if (preferred !== "wasm" && typeof navigator !== "undefined" && "gpu" in navigator) {
      try {
        const gpu = (navigator as unknown as { gpu?: { requestAdapter?: () => Promise<unknown> } }).gpu;
        if (gpu && typeof gpu.requestAdapter === "function") {
          const adapter = await gpu.requestAdapter();
          if (adapter) {
            return "webgpu";
          }
        }
      } catch {
        // Fallback to WASM
      }
    }

    // 2. Check WASM availability
    if (typeof WebAssembly !== "undefined") {
      return "wasm";
    }

    return "cpu";
  }

  /**
   * Initializes the ONNX Runtime session with the best available provider.
   */
  async loadModel(
    modelPathOrBuffer: string | ArrayBuffer,
    preferredProvider?: "webgpu" | "wasm" | "cpu"
  ): Promise<{ session: ort.InferenceSession; provider: ExecutionProvider }> {
    const provider = await this.detectBestProvider(preferredProvider);
    this.currentProvider = provider;

    const sessionOptions: ort.InferenceSession.SessionOptions = {
      executionProviders: [
        ...(provider === "webgpu" ? (["webgpu"] as unknown as ort.InferenceSession.ExecutionProviderConfig[]) : []),
        ...(provider === "wasm" ? (["wasm"] as unknown as ort.InferenceSession.ExecutionProviderConfig[]) : []),
        "cpu" as unknown as ort.InferenceSession.ExecutionProviderConfig,
      ],
      graphOptimizationLevel: "all",
    };

    const modelInput: string | Uint8Array =
      typeof modelPathOrBuffer === "string"
        ? modelPathOrBuffer
        : new Uint8Array(modelPathOrBuffer);

    const createSession = async (input: string | Uint8Array, opts: ort.InferenceSession.SessionOptions) => {
      if (typeof input === "string") {
        return await ort.InferenceSession.create(input, opts);
      } else {
        return await ort.InferenceSession.create(input, opts);
      }
    };

    try {
      this.session = await createSession(modelInput, sessionOptions);
      if (typeof modelPathOrBuffer === "string") {
        this.modelPath = modelPathOrBuffer;
      }
      return { session: this.session, provider: this.currentProvider };
    } catch (error) {
      // Fallback directly to WASM/CPU if WebGPU creation failed
      if (provider === "webgpu") {
        sessionOptions.executionProviders = ["wasm" as unknown as ort.InferenceSession.ExecutionProviderConfig, "cpu" as unknown as ort.InferenceSession.ExecutionProviderConfig];
        this.session = await createSession(modelInput, sessionOptions);
        this.currentProvider = "wasm";
        return { session: this.session, provider: "wasm" };
      }
      throw error;
    }
  }

  /**
   * Returns active execution provider
   */
  getProvider(): ExecutionProvider {
    return this.currentProvider;
  }

  /**
   * Returns whether a model session is currently loaded
   */
  isLoaded(): boolean {
    return this.session !== null;
  }

  /**
   * Runs inference on an input tensor
   */
  async runInference(
    feeds: Record<string, ort.Tensor>
  ): Promise<ort.InferenceSession.OnnxValueMapType> {
    if (!this.session) {
      throw new Error("No ONNX model session loaded. Call loadModel() first.");
    }
    return await this.session.run(feeds);
  }

  /**
   * Preprocesses RGBA pixel buffer into an NCHW Float32 ONNX Tensor with letterboxing.
   */
  preprocessImageData(
    pixels: Uint8ClampedArray | Uint8Array,
    srcWidth: number,
    srcHeight: number,
    targetWidth = 640,
    targetHeight = 640,
    normalizeMean = [0, 0, 0],
    normalizeStd = [1, 1, 1]
  ): PreprocessedTensorResult {
    // Calculate letterbox scaling to maintain aspect ratio
    const scale = Math.min(targetWidth / srcWidth, targetHeight / srcHeight);
    const scaledW = Math.round(srcWidth * scale);
    const scaledH = Math.round(srcHeight * scale);
    const padX = Math.floor((targetWidth - scaledW) / 2);
    const padY = Math.floor((targetHeight - scaledH) / 2);

    const float32Data = new Float32Array(3 * targetWidth * targetHeight);
    const channelSize = targetWidth * targetHeight;

    // Fill background with 114/255 (standard YOLO letterbox padding)
    const paddingVal = 114 / 255;
    for (let c = 0; c < 3; c++) {
      float32Data.fill(paddingVal, c * channelSize, (c + 1) * channelSize);
    }

    // Bilinear or nearest-neighbor resize into padded buffer
    for (let y = 0; y < scaledH; y++) {
      const srcY = Math.min(srcHeight - 1, Math.floor(y / scale));
      for (let x = 0; x < scaledW; x++) {
        const srcX = Math.min(srcWidth - 1, Math.floor(x / scale));
        const srcIdx = (srcY * srcWidth + srcX) * 4;

        const dstX = padX + x;
        const dstY = padY + y;
        const dstIdx = dstY * targetWidth + dstX;

        const r = (pixels[srcIdx] / 255.0 - normalizeMean[0]) / normalizeStd[0];
        const g = (pixels[srcIdx + 1] / 255.0 - normalizeMean[1]) / normalizeStd[1];
        const b = (pixels[srcIdx + 2] / 255.0 - normalizeMean[2]) / normalizeStd[2];

        float32Data[dstIdx] = r;
        float32Data[channelSize + dstIdx] = g;
        float32Data[2 * channelSize + dstIdx] = b;
      }
    }

    const tensor = new ort.Tensor("float32", float32Data, [1, 3, targetHeight, targetWidth]);

    return {
      tensor,
      originalWidth: srcWidth,
      originalHeight: srcHeight,
      scaleX: scale,
      scaleY: scale,
      padX,
      padY,
    };
  }

  /**
   * Calculates Intersection over Union (IoU) between two bounding boxes.
   */
  computeIoU(boxA: BoundingBox, boxB: BoundingBox): number {
    const [ax, ay, aw, ah] = boxA;
    const [bx, by, bw, bh] = boxB;

    const x1 = Math.max(ax, bx);
    const y1 = Math.max(ay, by);
    const x2 = Math.min(ax + aw, bx + bw);
    const y2 = Math.min(ay + ah, by + bh);

    const intersectionArea = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    if (intersectionArea === 0) return 0;

    const areaA = aw * ah;
    const areaB = bw * bh;
    const unionArea = areaA + areaB - intersectionArea;

    return unionArea > 0 ? intersectionArea / unionArea : 0;
  }

  /**
   * Performs Non-Maximum Suppression (NMS) to eliminate duplicate overlapping bounding boxes.
   */
  applyNMS(
    predictions: RawBoxPrediction[],
    iouThreshold = 0.45,
    maxBoxes = 100
  ): RawBoxPrediction[] {
    if (predictions.length === 0) return [];

    // Sort predictions descending by confidence
    const sorted = [...predictions].sort((a, b) => b.confidence - a.confidence);
    const selected: RawBoxPrediction[] = [];

    for (const current of sorted) {
      if (selected.length >= maxBoxes) break;

      let shouldKeep = true;
      for (const kept of selected) {
        if (this.computeIoU(current.bbox, kept.bbox) > iouThreshold) {
          shouldKeep = false;
          break;
        }
      }

      if (shouldKeep) {
        selected.push(current);
      }
    }

    return selected;
  }

  /**
   * De-scales a bounding box from letterbox coordinates back to original image dimensions.
   */
  rescaleBox(
    box: BoundingBox,
    preprocessed: PreprocessedTensorResult
  ): BoundingBox {
    const [x, y, w, h] = box;
    const { scaleX, scaleY, padX, padY, originalWidth, originalHeight } = preprocessed;

    const unpadX = Math.max(0, (x - padX) / scaleX);
    const unpadY = Math.max(0, (y - padY) / scaleY);
    const unpadW = w / scaleX;
    const unpadH = h / scaleY;

    return [
      Math.max(0, Math.min(originalWidth, Math.round(unpadX))),
      Math.max(0, Math.min(originalHeight, Math.round(unpadY))),
      Math.max(1, Math.min(originalWidth - unpadX, Math.round(unpadW))),
      Math.max(1, Math.min(originalHeight - unpadY, Math.round(unpadH))),
    ];
  }

  /**
   * Releases ONNX session memory
   */
  async dispose(): Promise<void> {
    if (this.session) {
      await this.session.release();
      this.session = null;
    }
  }
}
