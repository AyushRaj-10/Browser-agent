import { describe, it, expect } from "vitest";
import { InferenceTriggerController } from "../src/triggers/inference-controller";

describe("InferenceTriggerController", () => {
  it("executes task start immediately without debouncing", async () => {
    const controller = new InferenceTriggerController();
    let executed = false;

    const result = await controller.triggerTaskStart(async () => {
      executed = true;
      return "done";
    });

    expect(result).toBe("done");
    expect(executed).toBe(true);
    expect(controller.getStatus().triggerCount).toBe(1);
  });

  it("debounces rapid DOM mutations and only executes the latest run", async () => {
    const controller = new InferenceTriggerController({ debounceMs: 50 });
    let runCount = 0;

    const p1 = controller.triggerDebounced("DOM_MUTATION", async () => {
      runCount++;
      return 1;
    });

    const p2 = controller.triggerDebounced("DOM_MUTATION", async () => {
      runCount++;
      return 2;
    });

    const p3 = controller.triggerDebounced("DOM_MUTATION", async () => {
      runCount++;
      return 3;
    });

    // Only p3 should resolve
    const finalResult = await p3;
    expect(finalResult).toBe(3);
    expect(runCount).toBe(1);
  });

  it("cancels running inference properly", () => {
    const controller = new InferenceTriggerController();
    controller.cancel();
    expect(controller.getStatus().isRunning).toBe(false);
  });
});
