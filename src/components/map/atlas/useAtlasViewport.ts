import { computed, onBeforeUnmount, ref, type Ref } from "vue";

/** SVG-local pan/pinch coordinates work in both the message iframe and floating window. */
export function useAtlasViewport(svg: Ref<SVGSVGElement | null>) {
  const scale = ref(1), x = ref(0), y = ref(0), dragging = ref(false);
  const transform = computed(() => `translate(${x.value} ${y.value}) scale(${scale.value})`);
  const pointers = new Map<number, { x: number; y: number }>();
  let moved = false;
  let travel = 0;
  function local(clientX: number, clientY: number) {
    const matrix = svg.value?.getScreenCTM();
    return matrix ? new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse()) : new DOMPoint(750, 480);
  }
  function clamp() {
    const bounds = svg.value?.getBoundingClientRect();
    const a = bounds ? local(bounds.left, bounds.top) : new DOMPoint(0, 0);
    const b = bounds ? local(bounds.right, bounds.bottom) : new DOMPoint(1500, 960);
    // Account for the cropped portrait viewport as well as normal letterboxing.
    // Keep some of the actual mainland (not only empty SVG space) reachable.
    const left = Math.max(0, a.x), right = Math.min(1500, b.x);
    const top = Math.max(0, a.y), bottom = Math.min(960, b.y);
    x.value = Math.max(left + 90 - 1450 * scale.value, Math.min(right - 90 - 80 * scale.value, x.value));
    y.value = Math.max(top + 90 - 940 * scale.value, Math.min(bottom - 90 - 20 * scale.value, y.value));
  }
  function zoom(factor: number, anchor = new DOMPoint(750, 480)) {
    const next = Math.max(1, Math.min(5, scale.value * factor));
    const ratio = next / scale.value;
    x.value = anchor.x - (anchor.x - x.value) * ratio;
    y.value = anchor.y - (anchor.y - y.value) * ratio;
    scale.value = next;
    clamp();
  }
  function reset() { scale.value = 1; x.value = 0; y.value = 0; }
  function focus(point: readonly [number, number]) {
    scale.value = Math.max(scale.value, 2);
    x.value = 750 - point[0] * scale.value;
    y.value = 480 - point[1] * scale.value;
    clamp();
  }
  function down(event: PointerEvent) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (!pointers.size) { moved = false; travel = 0; }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size > 1) moved = true;
    (event.target as Element).setPointerCapture?.(event.pointerId);
    dragging.value = true;
  }
  function move(event: PointerEvent) {
    const before = pointers.get(event.pointerId);
    if (!before) return;
    const next = { x: event.clientX, y: event.clientY };
    travel += Math.hypot(next.x - before.x, next.y - before.y);
    if (travel > 5) moved = true;
    const other = [...pointers.entries()].find(([id]) => id !== event.pointerId)?.[1];
    if (other) {
      const oldDistance = Math.hypot(before.x - other.x, before.y - other.y);
      const newDistance = Math.hypot(next.x - other.x, next.y - other.y);
      const oldMid = local((before.x + other.x) / 2, (before.y + other.y) / 2);
      const newMid = local((next.x + other.x) / 2, (next.y + other.y) / 2);
      if (oldDistance > 4) zoom(newDistance / oldDistance, oldMid);
      x.value += newMid.x - oldMid.x; y.value += newMid.y - oldMid.y;
    } else if (moved) {
      const a = local(before.x, before.y), b = local(next.x, next.y);
      x.value += b.x - a.x; y.value += b.y - a.y;
    }
    pointers.set(event.pointerId, next);
    clamp();
  }
  function up(event: PointerEvent) {
    pointers.delete(event.pointerId);
    dragging.value = pointers.size > 0;
  }
  function wheel(event: WheelEvent) {
    event.preventDefault();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1);
    zoom(Math.exp(-Math.max(-120, Math.min(120, delta)) * 0.002), local(event.clientX, event.clientY));
  }
  function allowClick(event: MouseEvent) { return event.detail === 0 || !moved; }
  function key(event: KeyboardEvent) {
    if (event.target !== svg.value) return;
    const direction: Record<string, [number, number]> = { ArrowLeft: [65, 0], ArrowRight: [-65, 0], ArrowUp: [0, 65], ArrowDown: [0, -65] };
    const d = direction[event.key];
    if (d) { event.preventDefault(); x.value += d[0]; y.value += d[1]; clamp(); }
    if (["+", "=", "-", "Home"].includes(event.key)) {
      event.preventDefault();
      if (event.key === "Home") reset(); else zoom(event.key === "-" ? 0.8 : 1.25);
    }
  }
  onBeforeUnmount(() => pointers.clear());
  return { scale, transform, dragging, down, move, up, wheel, zoom, reset, focus, allowClick, key };
}
