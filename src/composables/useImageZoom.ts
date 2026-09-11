import { computed, onBeforeUnmount, onMounted, ref } from "vue";

export function useImageZoom() {
  const scale = ref(1);
  const x = ref(0);
  const y = ref(0);
  const dragging = ref(false);
  let startX = 0;
  let startY = 0;
  let pinchDistance: number | null = null;
  const transform = computed(() => `translate(${x.value}px, ${y.value}px) scale(${scale.value})`);

  function reset(): void {
    scale.value = 1;
    x.value = 0;
    y.value = 0;
    dragging.value = false;
    pinchDistance = null;
  }

  function wheel(event: WheelEvent): void {
    event.preventDefault();
    scale.value = Math.min(5, Math.max(0.5, scale.value - Math.sign(event.deltaY) * 0.1));
  }

  function mouseDown(event: MouseEvent): void {
    event.preventDefault();
    dragging.value = true;
    startX = event.clientX - x.value;
    startY = event.clientY - y.value;
  }

  function mouseMove(event: MouseEvent): void {
    if (!dragging.value) return;
    x.value = event.clientX - startX;
    y.value = event.clientY - startY;
  }

  function mouseUp(): void {
    dragging.value = false;
  }

  function touchStart(event: TouchEvent): void {
    if (event.touches.length === 2) {
      pinchDistance = Math.hypot(
        event.touches[0]!.clientX - event.touches[1]!.clientX,
        event.touches[0]!.clientY - event.touches[1]!.clientY,
      );
    } else if (event.touches.length === 1) {
      dragging.value = true;
      startX = event.touches[0]!.clientX - x.value;
      startY = event.touches[0]!.clientY - y.value;
    }
  }

  function touchMove(event: TouchEvent): void {
    event.preventDefault();
    if (event.touches.length === 2 && pinchDistance) {
      const distance = Math.hypot(
        event.touches[0]!.clientX - event.touches[1]!.clientX,
        event.touches[0]!.clientY - event.touches[1]!.clientY,
      );
      scale.value = Math.min(5, Math.max(0.5, scale.value * distance / pinchDistance));
      pinchDistance = distance;
    } else if (event.touches.length === 1 && dragging.value) {
      x.value = event.touches[0]!.clientX - startX;
      y.value = event.touches[0]!.clientY - startY;
    }
  }

  function touchEnd(event: TouchEvent): void {
    if (event.touches.length < 2) pinchDistance = null;
    if (event.touches.length === 0) dragging.value = false;
  }

  onMounted(() => {
    globalThis.addEventListener("mousemove", mouseMove);
    globalThis.addEventListener("mouseup", mouseUp);
  });
  onBeforeUnmount(() => {
    globalThis.removeEventListener("mousemove", mouseMove);
    globalThis.removeEventListener("mouseup", mouseUp);
  });

  return { transform, reset, wheel, mouseDown, touchStart, touchMove, touchEnd };
}
