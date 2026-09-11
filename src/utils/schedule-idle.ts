type IdleRuntime = typeof globalThis & {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout?: number },
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

/** Run non-critical work after the first paint, with a timeout fallback. */
export function scheduleAfterFirstPaint(
  task: () => void,
  timeout = 1500,
): () => void {
  const runtime = globalThis as IdleRuntime;
  let cancelled = false;
  let frameHandle: number | undefined;
  let idleHandle: number | undefined;
  let timerHandle: ReturnType<typeof globalThis.setTimeout> | undefined;

  const run = (): void => {
    if (cancelled) return;
    cancelled = true;
    task();
  };

  const scheduleIdle = (): void => {
    frameHandle = undefined;
    if (typeof runtime.requestIdleCallback === "function") {
      idleHandle = runtime.requestIdleCallback(run, { timeout });
      return;
    }
    timerHandle = globalThis.setTimeout(run, Math.min(timeout, 160));
  };

  if (typeof globalThis.requestAnimationFrame === "function") {
    frameHandle = globalThis.requestAnimationFrame(scheduleIdle);
  } else {
    timerHandle = globalThis.setTimeout(scheduleIdle, 0);
  }

  return () => {
    cancelled = true;
    if (frameHandle !== undefined && typeof globalThis.cancelAnimationFrame === "function") {
      globalThis.cancelAnimationFrame(frameHandle);
    }
    if (idleHandle !== undefined && typeof runtime.cancelIdleCallback === "function") {
      runtime.cancelIdleCallback(idleHandle);
    }
    if (timerHandle !== undefined) globalThis.clearTimeout(timerHandle);
  };
}
