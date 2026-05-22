export const VERTICAL_DISMISS_DISTANCE_PX = 80;
/** Minimum vertical velocity (px/s) from gesture-handler pan end. */
export const VERTICAL_DISMISS_VELOCITY = 900;

export function shouldDismissPhotoViewer(
  translationY: number,
  velocityY: number,
): boolean {
  return (
    Math.abs(translationY) >= VERTICAL_DISMISS_DISTANCE_PX ||
    Math.abs(velocityY) >= VERTICAL_DISMISS_VELOCITY
  );
}

export function isVerticalDismissGesture(
  deltaX: number,
  deltaY: number,
): boolean {
  return Math.abs(deltaY) > 6 && Math.abs(deltaY) > Math.abs(deltaX) * 1.1;
}
