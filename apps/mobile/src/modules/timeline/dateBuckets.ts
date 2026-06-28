import { t } from '@/i18n';

export type TimelineDateBucket = 'today' | 'yesterday' | 'thisWeek' | 'earlier';

const MS_PER_DAY = 86_400_000;

function startOfDay(date: Date): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

/**
 * Buckets a moment timestamp into a calm relative date section used for the
 * timeline section dividers. Future timestamps clamp to `today`; unparseable
 * timestamps fall back to `earlier`.
 */
export function getTimelineDateBucket(
  timestamp: string,
  now: Date = new Date(),
): TimelineDateBucket {
  const then = new Date(timestamp);

  if (Number.isNaN(then.getTime())) {
    return 'earlier';
  }

  const diffDays = Math.round(
    (startOfDay(now) - startOfDay(then)) / MS_PER_DAY,
  );

  if (diffDays <= 0) {
    return 'today';
  }
  if (diffDays === 1) {
    return 'yesterday';
  }
  if (diffDays < 7) {
    return 'thisWeek';
  }
  return 'earlier';
}

export function getTimelineDateBucketLabel(bucket: TimelineDateBucket): string {
  return t(`timeline.feed.sections.${bucket}`);
}
