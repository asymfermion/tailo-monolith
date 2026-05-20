/** Calm, timeline-first palette from product guidelines. */
export const colors = {
  background: '#F7F5F2',
  surface: '#FFFFFF',
  text: '#1C1C1A',
  textMuted: '#6B6B66',
  accent: '#5C7C6A',
  border: '#E8E4DE',
  /** Moment separators — visible on background without feeling harsh */
  timelineDivider: '#D8D2C8',
  tabBarBorder: 'rgba(232, 228, 222, 0.4)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
