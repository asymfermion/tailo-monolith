import type { EventSource, EventType } from '@tailo/shared';

import type { EntityProcessingState } from './processing-state';

/** Promoted timeline moment (maps to `local_events`). */
export interface LocalEvent {
  localEventId: string;
  petId: string;
  timestamp: string;
  source: EventSource;
  eventType: EventType;
  caption: string | null;
  captionLanguage: string | null;
  confidence: number | null;
  isFavorite: boolean;
  processingState: EntityProcessingState;
  selectedAssetIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type NewLocalEvent = Pick<
  LocalEvent,
  'localEventId' | 'petId' | 'timestamp' | 'source' | 'selectedAssetIds'
> &
  Partial<
    Pick<
      LocalEvent,
      | 'eventType'
      | 'caption'
      | 'captionLanguage'
      | 'confidence'
      | 'isFavorite'
      | 'processingState'
    >
  >;
