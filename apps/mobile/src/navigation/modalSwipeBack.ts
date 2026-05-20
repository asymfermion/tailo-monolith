/** Swipe-right on a modal to dismiss (matches iOS back gesture feel). */
export const MODAL_SWIPE_EDGE_WIDTH = 40;

/**
 * @deprecated Prefer `getModalSwipeHeaderExclusion` from `modalHeaderInset` (safe-area aware).
 * Kept so stale Metro bundles do not throw at runtime.
 */
export const MODAL_SWIPE_HEADER_EXCLUSION = 56;

/** Release past this fraction of the card width to dismiss. */
export const MODAL_SWIPE_DISMISS_FRACTION = 0.12;

/** Always dismiss past this drag distance (px). */
export const MODAL_SWIPE_MIN_DISMISS_PX = 40;

export const MODAL_SWIPE_VELOCITY_THRESHOLD = 160;

export const MODAL_PUSH_DURATION_MS = 280;

export const MODAL_POP_DURATION_MS = 240;

/** Extra px so the card clears the container after dismiss animation. */
export const MODAL_DISMISS_OVERSHOOT_PX = 32;

export function getModalSwipeDismissThreshold(containerWidth: number): number {
  return Math.max(
    MODAL_SWIPE_MIN_DISMISS_PX,
    containerWidth * MODAL_SWIPE_DISMISS_FRACTION,
  );
}

export function getModalDismissTargetX(containerWidth: number): number {
  return containerWidth + MODAL_DISMISS_OVERSHOOT_PX;
}

export function shouldPopOnSwipeRight(
  translationX: number,
  velocityX: number,
  containerWidth: number,
): boolean {
  if (translationX >= MODAL_SWIPE_MIN_DISMISS_PX) {
    return true;
  }

  if (translationX >= containerWidth * 0.45) {
    return true;
  }

  const dismissThreshold = getModalSwipeDismissThreshold(containerWidth);

  if (translationX >= dismissThreshold) {
    return true;
  }

  return velocityX >= MODAL_SWIPE_VELOCITY_THRESHOLD && translationX >= 20;
}
