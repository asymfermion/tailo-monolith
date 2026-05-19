import type { EventSource, EventType } from '@tailo/shared';

import type { CaptionSource } from '@/db/localEvents';
import type { DetectedPetType } from './local-asset';

/** Resolved media item shown in the timeline UI. */
export interface TimelineEventMedia {
  localAssetId: string;
  uri: string;
  width: number;
  height: number;
  isPrimary: boolean;
  detectedPetType: DetectedPetType | null;
  petConfidence: number | null;
  overallScore: number;
  isPetCandidate: boolean;
  detectionDebugLabel: string | null;
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
  captionSource: CaptionSource | null;
  isFavorite: boolean;
  media: TimelineEventMedia[];
}
