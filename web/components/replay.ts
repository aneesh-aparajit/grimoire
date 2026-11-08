/**
 * Calls `enter` each time `el` comes into view, and `leave` once it has left
 * the viewport entirely, so reveals replay on every visit without flickering
 * while the element is still partly on screen.
 */
export function observeReplay(
  el: Element,
  enter: () => void,
  leave: () => void,
  enterOptions: IntersectionObserverInit = { rootMargin: "0px 0px -20% 0px" },
) {
  let inside = false;
  const onEnter = new IntersectionObserver((list) => {
    if (!inside && list.some((e) => e.isIntersecting)) {
      inside = true;
      enter();
    }
  }, enterOptions);
  const onLeave = new IntersectionObserver((list) => {
    if (inside && list.every((e) => !e.isIntersecting)) {
      inside = false;
      leave();
    }
  });
  onEnter.observe(el);
  onLeave.observe(el);
  return () => {
    onEnter.disconnect();
    onLeave.disconnect();
  };
}
