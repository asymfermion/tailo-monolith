import { describe, expect, it } from '@jest/globals';

import {
  getDropdownMenuPlacement,
  resolveCenteredMenuFrame,
  resolveDropdownMenuFrame,
  type DropdownAnchor,
} from './DismissibleDropdownMenu';

function placement(anchor: DropdownAnchor, insets = { top: 50, bottom: 34 }) {
  return getDropdownMenuPlacement(anchor, insets);
}

describe('getDropdownMenuPlacement', () => {
  it('opens below when more space is under the anchor', () => {
    const result = placement({ x: 0, y: 100, width: 300, height: 44 });

    expect(result.openBelow).toBe(true);
    expect(result.maxHeight).toBeGreaterThan(200);
  });

  it('opens above when the anchor is near the bottom of the screen', () => {
    const result = placement({ x: 0, y: 700, width: 300, height: 44 });

    expect(result.openBelow).toBe(false);
    expect(result.maxHeight).toBeGreaterThanOrEqual(120);
  });

  it('never returns a max height below the minimum', () => {
    const result = placement({ x: 0, y: 400, width: 300, height: 44 });

    expect(result.maxHeight).toBeGreaterThanOrEqual(120);
  });
});

describe('resolveDropdownMenuFrame', () => {
  it('uses a minimum width when the anchor measured zero width', () => {
    expect(
      resolveDropdownMenuFrame({ x: 24, y: 100, width: 0, height: 44 }),
    ).toEqual({
      left: 24,
      width: 220,
    });
  });

  it('uses a fixed menu width when provided', () => {
    expect(
      resolveDropdownMenuFrame(
        { x: 24, y: 100, width: 345, height: 60 },
        220,
        280,
      ),
    ).toEqual({
      left: 24,
      width: 280,
    });
  });
});

describe('resolveCenteredMenuFrame', () => {
  it('uses a fixed centered menu width when provided', () => {
    expect(
      resolveCenteredMenuFrame({ top: 50, bottom: 34 }, 220, 280).width,
    ).toBe(280);
  });
});
