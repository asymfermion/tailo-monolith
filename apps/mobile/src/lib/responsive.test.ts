import {
  clamp,
  getContentWidth,
  getDialogMaxWidth,
  isCompactWidth,
} from './responsive';

describe('responsive', () => {
  it('clamps values', () => {
    expect(clamp(5, 10, 20)).toBe(10);
    expect(clamp(15, 10, 20)).toBe(15);
    expect(clamp(25, 10, 20)).toBe(20);
  });

  it('computes dialog max width from screen width', () => {
    expect(getDialogMaxWidth(320)).toBe(245);
    expect(getDialogMaxWidth(390)).toBe(308);
    expect(getDialogMaxWidth(800)).toBe(320);
  });

  it('computes content width with standard inset', () => {
    expect(getContentWidth(390)).toBe(342);
  });

  it('detects compact phone widths', () => {
    expect(isCompactWidth(375)).toBe(true);
    expect(isCompactWidth(390)).toBe(false);
  });
});
