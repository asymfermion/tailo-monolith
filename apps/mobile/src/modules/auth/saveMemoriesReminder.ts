const DAY_MS = 24 * 60 * 60 * 1000;

export const SAVE_MEMORIES_REMINDER = {
  firstValueDelayMs: 30 * 60 * 1000,
  repeatIntervalMs: 3 * DAY_MS,
  snoozeIntervalMs: 3 * DAY_MS,
  openedIntervalMs: 3 * DAY_MS,
} as const;

export type SaveMemoriesReminderInput = {
  nowMs: number;
  hasTimelineValue: boolean;
  firstTimelineValueSeenAtMs: number | null;
  lastPromptShownAtMs: number | null;
  snoozedUntilMs: number | null;
};

export function shouldShowSaveMemoriesReminder(
  input: SaveMemoriesReminderInput,
): boolean {
  if (!input.hasTimelineValue) {
    return false;
  }

  if (
    input.snoozedUntilMs != null &&
    Number.isFinite(input.snoozedUntilMs) &&
    input.nowMs < input.snoozedUntilMs
  ) {
    return false;
  }

  if (
    input.firstTimelineValueSeenAtMs != null &&
    Number.isFinite(input.firstTimelineValueSeenAtMs) &&
    input.nowMs - input.firstTimelineValueSeenAtMs <
      SAVE_MEMORIES_REMINDER.firstValueDelayMs
  ) {
    return false;
  }

  if (
    input.lastPromptShownAtMs != null &&
    Number.isFinite(input.lastPromptShownAtMs) &&
    input.nowMs - input.lastPromptShownAtMs <
      SAVE_MEMORIES_REMINDER.repeatIntervalMs
  ) {
    return false;
  }

  return true;
}
