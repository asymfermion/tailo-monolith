import {
  MODAL_SWIPE_MIN_DISMISS_PX,
  getModalDismissTargetX,
  shouldPopOnSwipeRight,
} from './modalSwipeBack';

const CONTAINER_WIDTH = 360;

describe('modal swipe back', () => {
  it('targets past the container edge so the card fully clears', () => {
    expect(getModalDismissTargetX(CONTAINER_WIDTH)).toBe(392);
  });

  it('pops after a short edge swipe', () => {
    expect(
      shouldPopOnSwipeRight(MODAL_SWIPE_MIN_DISMISS_PX, 0, CONTAINER_WIDTH),
    ).toBe(true);
  });

  it('pops when most of the card has moved off', () => {
    expect(
      shouldPopOnSwipeRight(CONTAINER_WIDTH * 0.5, 0, CONTAINER_WIDTH),
    ).toBe(true);
  });

  it('pops on fast flick with moderate distance', () => {
    expect(shouldPopOnSwipeRight(24, 200, CONTAINER_WIDTH)).toBe(true);
  });

  it('does not pop on small movement', () => {
    expect(shouldPopOnSwipeRight(12, 80, CONTAINER_WIDTH)).toBe(false);
  });
});
