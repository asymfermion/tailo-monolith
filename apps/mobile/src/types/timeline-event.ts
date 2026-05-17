import type { EventSource, EventType } from '@tailo/shared';

/** Resolved media item shown in the timeline UI. */
export interface TimelineEventMedia {
  localAssetId: string;
  uri: string;
  width: number;
  height: number;
  isPrimary: boolean;
}

/**
 * View model for a timeline row — built from a ready `LocalEventCandidate`
 * plus resolved `LocalAsset` / `LocalMediaScore` data.
 */
export interface TimelineEvent {
  localEventId: string;
  timestamp: string;
  eventType: EventType;
  source: EventSource;
  caption: string | null;
  isFavorite: boolean;
  media: TimelineEventMedia[];
}
