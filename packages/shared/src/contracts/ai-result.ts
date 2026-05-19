import { EVENT_TYPES, type EventType } from '../constants/event-types.ts';

export const AI_CONFIDENCE_THRESHOLD = 0.5;
export const AI_CAPTION_MAX_LENGTH = 280;

/** Model output shape (Vertex / stub providers). */
export type AiCaptionResult = {
  caption: string | null;
  eventType: EventType;
  confidence: number | null;
};

export function parseAiCaptionResult(value: unknown): AiCaptionResult | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const caption = Reflect.get(value, 'caption');
  const eventType = Reflect.get(value, 'eventType');
  const confidence = Reflect.get(value, 'confidence');

  if (caption !== null && typeof caption !== 'string') {
    return null;
  }

  if (
    typeof eventType !== 'string' ||
    !EVENT_TYPES.includes(eventType as EventType)
  ) {
    return null;
  }

  if (
    confidence !== null &&
    (typeof confidence !== 'number' || confidence < 0 || confidence > 1)
  ) {
    return null;
  }

  return {
    caption,
    eventType: eventType as EventType,
    confidence,
  };
}

export function sanitizeAiCaption(caption: string | null): string | null {
  if (caption === null) {
    return null;
  }

  const trimmed = caption.trim().slice(0, AI_CAPTION_MAX_LENGTH);

  if (!trimmed) {
    return null;
  }

  const lower = trimmed.toLowerCase();
  const blocked = [
    'as an ai',
    'language model',
    'diagnos',
    'prescri',
    'medication',
    'vet says',
  ];

  if (blocked.some((phrase) => lower.includes(phrase))) {
    return null;
  }

  return trimmed;
}
