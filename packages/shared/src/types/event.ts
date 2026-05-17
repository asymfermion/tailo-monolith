import type { EventType } from '../constants/event-types';

export type EventSource = 'camera_roll' | 'in_app' | 'manual';

export type MediaAssetType = 'image' | 'video' | 'receipt' | 'audio';

export interface Event {
  id: string;
  petId: string;
  timestamp: string;
  eventType: EventType;
  caption?: string;
  captionLanguage?: string;
  confidence?: number;
  source: EventSource;
  isFavorite: boolean;
}
