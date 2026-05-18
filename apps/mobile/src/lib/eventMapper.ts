import type { Event } from '@tailo/shared';

import type { LocalEvent } from '@/types';

export function mapLocalEventToSharedEvent(localEvent: LocalEvent): Event {
  return {
    id: localEvent.localEventId,
    petId: localEvent.petId,
    timestamp: localEvent.timestamp,
    eventType: localEvent.eventType,
    caption: localEvent.caption ?? undefined,
    captionLanguage: localEvent.captionLanguage ?? undefined,
    confidence: localEvent.confidence ?? undefined,
    source: localEvent.source,
    isFavorite: localEvent.isFavorite,
  };
}
