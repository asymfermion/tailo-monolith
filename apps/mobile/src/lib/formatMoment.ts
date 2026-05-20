import type { EventType } from '@tailo/shared';

import { getIntlLocale, t } from '@/i18n';

export function formatTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat(getIntlLocale(), {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

export function formatEventType(eventType: EventType): string {
  switch (eventType) {
    case 'walk':
      return t('eventType.walk');
    case 'play':
      return t('eventType.play');
    case 'rest':
      return t('eventType.rest');
    case 'eating':
      return t('eventType.eating');
    default:
      return t('eventType.unknown');
  }
}

export function formatPetType(type: 'dog' | 'cat'): string {
  return t(`petType.${type}`);
}
