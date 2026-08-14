/* Loaders and the PWA listeners need to repaint, but the renderer imports the
 * views which import state -- wiring them directly would make a cycle. The entry
 * point registers the renderer here once, and everything else calls rerender(). */

let renderer = () => {};

export function setRenderer(fn) {
  renderer = fn;
}

export function rerender() {
  renderer();
}
