/** MVP event types — keep in sync with backend schema when added. */
export const EVENT_TYPES = [
  'walk',
  'play',
  'rest',
  'eating',
  'unknown',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];
