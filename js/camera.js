// Scrolling the view.
//
// The camera is just an offset in screen pixels that gets added to the
// origin before drawing. Dragging, the mouse wheel / trackpad and the arrow
// keys all change that offset. Nothing in the world moves; we only change
// where we look from.
//
// A press that hardly moves is a click, not a drag: the view only starts
// scrolling once the pointer has moved more than CLICK_SLOP pixels.
//
// After a click the camera follows the avatar gently (see followPoint).
// Scrolling by hand switches following off until the next click, so the
// camera never fights the player.

const KEY_STEP = 40; // pixels per arrow-key press
const CLICK_SLOP = 5; // pixels a press may wander and still count as a click

export function createCamera() {
  return {
    x: 0,
    y: 0,
    drag: null,
    follow: false, // follow the avatar? Set on click, cleared by manual scrolling
    chasing: false, // currently gliding to bring the avatar back to the middle
  };
}

/** Keep the camera within limits() = { x, y } of the centre. */
export function clampCamera(camera, limits) {
  const { x, y } = limits();
  camera.x = Math.max(-x, Math.min(x, camera.x));
  camera.y = Math.max(-y, Math.min(y, camera.y));
}

/**
 * Follow screen point p (the avatar) gently. Nothing happens while it stays
 * in the middle half of the view; once it wanders out, the camera glides
 * until it is centred again. dt is the frame time in ms.
 */
export function followPoint(camera, p, view, dt, limits) {
  if (!camera.follow || (camera.drag && camera.drag.moved)) return;
  const dx = p.x - view.w / 2;
  const dy = p.y - view.h / 2;
  if (Math.abs(dx) > view.w / 4 || Math.abs(dy) > view.h / 4) camera.chasing = true;
  if (Math.hypot(dx, dy) < 4) camera.chasing = false;
  if (!camera.chasing) return;
  // Cover the same share of the remaining distance every ms: fast when far
  // away, slowing down smoothly as it arrives.
  const k = 1 - Math.exp(-dt / 450);
  camera.x -= dx * k;
  camera.y -= dy * k;
  clampCamera(camera, limits);
}

/**
 * Hook up input. `limits()` must return { x, y }: how far (in pixels) the
 * camera may move from the centre in each direction. It is a function so it
 * can depend on the current window size. `onClick(point)` is called with
 * the canvas position of every press that wasn't a drag.
 */
export function attachCamera(canvas, camera, limits, onClick) {
  const clamp = () => clampCamera(camera, limits);
  const manual = () => {
    camera.follow = false;
    camera.chasing = false;
  };

  // Pointer events cover mouse, pen and touch with the same code.
  canvas.addEventListener('pointerdown', (e) => {
    camera.drag = { x: e.clientX, y: e.clientY, startX: camera.x, startY: camera.y, moved: false };
    canvas.setPointerCapture(e.pointerId); // keep getting moves even outside the canvas
  });
  canvas.addEventListener('pointermove', (e) => {
    const drag = camera.drag;
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) <= CLICK_SLOP) return;
    drag.moved = true;
    manual();
    canvas.style.cursor = 'grabbing';
    camera.x = camera.drag.startX + (e.clientX - camera.drag.x);
    camera.y = camera.drag.startY + (e.clientY - camera.drag.y);
    clamp();
  });
  const endDrag = () => {
    camera.drag = null;
    canvas.style.cursor = '';
  };
  canvas.addEventListener('pointerup', (e) => {
    const wasClick = camera.drag && !camera.drag.moved;
    endDrag();
    if (wasClick && onClick) onClick({ x: e.offsetX, y: e.offsetY });
  });
  canvas.addEventListener('pointercancel', endDrag);

  // Wheel and two-finger trackpad scrolling. preventDefault stops the
  // browser from also trying to scroll (or zoom) the page itself.
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      manual();
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
    manual();
    clamp();
  });

  window.addEventListener('resize', clamp);
}
