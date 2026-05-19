import type { EventType } from '@tailo/shared';

const PLACEHOLDER_CAPTIONS = [
  'A small moment from today.',
  'A quiet memory.',
  'Another gentle moment.',
] as const;

export function pickPlaceholderCaption(seed: string): string {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash + seed.charCodeAt(index)) % PLACEHOLDER_CAPTIONS.length;
  }

  return PLACEHOLDER_CAPTIONS[hash] ?? PLACEHOLDER_CAPTIONS[0];
}

export function resolveDisplayCaption(
  caption: string | null,
  captionSource: 'user' | 'ai' | 'placeholder' | null,
  seed: string,
): string {
  if (caption && caption.trim()) {
    return caption.trim();
  }

  if (captionSource === 'placeholder' || !captionSource) {
    return pickPlaceholderCaption(seed);
  }

  return pickPlaceholderCaption(seed);
}

export function isLowConfidenceEventType(eventType: EventType): boolean {
  return eventType === 'unknown';
}
