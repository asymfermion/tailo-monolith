import {
  SAVE_MEMORIES_REMINDER,
  shouldShowSaveMemoriesReminder,
} from './saveMemoriesReminder';

describe('shouldShowSaveMemoriesReminder', () => {
  const now = Date.UTC(2026, 4, 25, 12, 0, 0);

  it('requires timeline value', () => {
    expect(
      shouldShowSaveMemoriesReminder({
        nowMs: now,
        hasTimelineValue: false,
        firstTimelineValueSeenAtMs: null,
        lastPromptShownAtMs: null,
        snoozedUntilMs: null,
      }),
    ).toBe(false);
  });

  it('waits initial delay after first timeline value', () => {
    expect(
      shouldShowSaveMemoriesReminder({
        nowMs: now,
        hasTimelineValue: true,
        firstTimelineValueSeenAtMs: now - 5 * 60 * 1000,
        lastPromptShownAtMs: null,
        snoozedUntilMs: null,
      }),
    ).toBe(false);
  });

  it('respects snooze cooldown', () => {
    expect(
      shouldShowSaveMemoriesReminder({
        nowMs: now,
        hasTimelineValue: true,
        firstTimelineValueSeenAtMs:
          now - SAVE_MEMORIES_REMINDER.firstValueDelayMs - 1,
        lastPromptShownAtMs: null,
        snoozedUntilMs: now + 1000,
      }),
    ).toBe(false);
  });

  it('respects repeat interval', () => {
    expect(
      shouldShowSaveMemoriesReminder({
        nowMs: now,
        hasTimelineValue: true,
        firstTimelineValueSeenAtMs:
          now - SAVE_MEMORIES_REMINDER.firstValueDelayMs - 1,
        lastPromptShownAtMs: now - 1000,
        snoozedUntilMs: null,
      }),
    ).toBe(false);
  });
});
