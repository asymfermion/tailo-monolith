import type { EventSource } from '@tailo/shared';

/** Pipeline stage for a grouped moment before it appears on the timeline. */
export type CandidateStatus =
  | 'pending'
  | 'clustering'
  | 'scored'
  | 'ready'
  | 'rejected';

export interface LocalEventCandidate {
  localEventId: string;
  timestamp: string;
  source: EventSource;
  candidateStatus: CandidateStatus;
  /** Ordered local asset IDs chosen for this event (2–5 when ready). */
  selectedAssetIds: string[];
  createdAt: string;
}

export type NewLocalEventCandidate = Pick<
  LocalEventCandidate,
  'localEventId' | 'timestamp' | 'source'
> &
  Partial<Pick<LocalEventCandidate, 'candidateStatus' | 'selectedAssetIds'>>;
