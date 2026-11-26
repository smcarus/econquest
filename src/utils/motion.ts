/**
 * Reduced motion (WCAG 2.2, 2.3.3 Animation from interactions). When the computer's "reduce motion"
 * setting is on, the app scrolls in one jump instead of gliding. The matching style rule in
 * src/index.css stops spinners and transitions.
 */
export function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** The scroll behaviour to pass to scrollIntoView / scrollTo: 'smooth', or 'auto' with reduced motion. */
export function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}
