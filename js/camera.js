// Scrolling the view.
//
// The camera is just an offset in screen pixels that gets added to the
// origin before drawing. Dragging, the mouse wheel / trackpad and the arrow
// keys all change that offset. Nothing in the world moves; we only change
// where we look from.

const KEY_STEP = 40; // pixels per arrow-key press

export function createCamera() {
  return { x: 0, y: 0, drag: null };
}

/**
 * Hook up input. `limits()` must return { x, y }: how far (in pixels) the
 * camera may move from the centre in each direction. It is a function so it
 * can depend on the current window size.
 */
export function attachCamera(canvas, camera, limits) {
  const clamp = () => {
    const { x, y } = limits();
    camera.x = Math.max(-x, Math.min(x, camera.x));
    camera.y = Math.max(-y, Math.min(y, camera.y));
  };

  // Pointer events cover mouse, pen and touch with the same code.
  canvas.addEventListener('pointerdown', (e) => {
    camera.drag = { x: e.clientX, y: e.clientY, startX: camera.x, startY: camera.y };
    canvas.setPointerCapture(e.pointerId); // keep getting moves even outside the canvas
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!camera.drag) return;
    camera.x = camera.drag.startX + (e.clientX - camera.drag.x);
    camera.y = camera.drag.startY + (e.clientY - camera.drag.y);
    clamp();
  });
  const endDrag = () => {
    camera.drag = null;
    canvas.style.cursor = '';
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  // Wheel and two-finger trackpad scrolling. preventDefault stops the
  // browser from also trying to scroll (or zoom) the page itself.
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      camera.x -= e.shiftKey ? e.deltaY : e.deltaX;
      camera.y -= e.shiftKey ? 0 : e.deltaY;
      clamp();
    },
    { passive: false },
  );

  window.addEventListener('keydown', (e) => {
    const moves = { ArrowLeft: [1, 0], ArrowRight: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
    if (moves[e.key]) {
      camera.x += moves[e.key][0] * KEY_STEP;
      camera.y += moves[e.key][1] * KEY_STEP;
    } else if (e.key === 'Home') {
      camera.x = 0;
      camera.y = 0;
    } else {
      return;
    }
    e.preventDefault();
    clamp();
  });

  window.addEventListener('resize', clamp);
}
