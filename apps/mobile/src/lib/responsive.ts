import { useWindowDimensions } from 'react-native';

/** Minimum comfortable tap target (Apple HIG / Material). */
export const MIN_TOUCH_TARGET = 44;

/** Cap modal / menu width on phones and tablets. */
export const DIALOG_MAX_WIDTH = 320;

/** Horizontal inset assumed for full-width content (matches `spacing.lg` × 2). */
export const CONTENT_HORIZONTAL_INSET = 48;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Max width for centered overlays (language menu, alerts-style sheets). */
export function getDialogMaxWidth(screenWidth: number): number {
  const insetWidth = Math.max(0, screenWidth - CONTENT_HORIZONTAL_INSET);
  return clamp(Math.round(insetWidth * 0.9), 240, DIALOG_MAX_WIDTH);
}

/** Usable content width inside standard horizontal padding. */
export function getContentWidth(screenWidth: number): number {
  return Math.max(0, screenWidth - CONTENT_HORIZONTAL_INSET);
}

export function useDialogMaxWidth(): number {
  const { width } = useWindowDimensions();
  return getDialogMaxWidth(width);
}

export function useContentWidth(): number {
  const { width } = useWindowDimensions();
  return getContentWidth(width);
}

/** True when width is below a common compact phone threshold. */
export function isCompactWidth(screenWidth: number): boolean {
  return screenWidth < 380;
}
