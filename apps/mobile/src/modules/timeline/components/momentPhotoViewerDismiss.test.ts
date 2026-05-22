import {
  isVerticalDismissGesture,
  shouldDismissPhotoViewer,
} from './momentPhotoViewerDismiss';

describe('momentPhotoViewerDismiss', () => {
  it('detects vertical-dominant gestures', () => {
    expect(isVerticalDismissGesture(4, 40)).toBe(true);
    expect(isVerticalDismissGesture(40, 4)).toBe(false);
  });

  it('dismisses on distance or velocity', () => {
    expect(shouldDismissPhotoViewer(80, 0)).toBe(true);
    expect(shouldDismissPhotoViewer(-90, 0)).toBe(true);
    expect(shouldDismissPhotoViewer(20, 1200)).toBe(true);
    expect(shouldDismissPhotoViewer(20, 200)).toBe(false);
  });
});
