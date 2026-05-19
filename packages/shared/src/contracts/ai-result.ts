import { EVENT_TYPES, type EventType } from '../constants/event-types.ts';

export const AI_CONFIDENCE_THRESHOLD = 0.5;
export const AI_CAPTION_MAX_LENGTH = 280;

export type VisiblePetType = 'dog' | 'cat' | null;

/** Coerce model quirks (`"null"`, `"none"`, empty string) to JSON null. */
export function normalizeVisiblePetType(value: unknown): VisiblePetType {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (
      normalized === '' ||
      normalized === 'null' ||
      normalized === 'none' ||
      normalized === 'unknown'
    ) {
      return null;
    }

    if (normalized === 'dog' || normalized === 'cat') {
      return normalized;
    }
  }

  return null;
}

/** Model output shape (Vertex / stub providers). */
export type AiCaptionResult = {
  caption: string | null;
  eventType: EventType;
  confidence: number | null;
  /** True when the profile pet is clearly visible and matches the expected type. */
  profilePetValid: boolean;
  /** Pet species the model sees as the main subject, if any. */
  visiblePetType: VisiblePetType;
  petValidationConfidence: number | null;
};

export function parseAiCaptionResult(value: unknown): AiCaptionResult | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const caption = Reflect.get(value, 'caption');
  const eventType = Reflect.get(value, 'eventType');
  const confidence = Reflect.get(value, 'confidence');
  const profilePetValid = Reflect.get(value, 'profilePetValid');
  const visiblePetType = Reflect.get(value, 'visiblePetType');
  const petValidationConfidence = Reflect.get(value, 'petValidationConfidence');

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

  if (typeof profilePetValid !== 'boolean') {
    return null;
  }

  const normalizedVisiblePetType = normalizeVisiblePetType(visiblePetType);

  if (
    visiblePetType !== null &&
    visiblePetType !== undefined &&
    typeof visiblePetType !== 'string'
  ) {
    return null;
  }

  if (
    petValidationConfidence !== null &&
    petValidationConfidence !== undefined &&
    (typeof petValidationConfidence !== 'number' ||
      petValidationConfidence < 0 ||
      petValidationConfidence > 1)
  ) {
    return null;
  }

  return {
    caption,
    eventType: eventType as EventType,
    confidence,
    profilePetValid,
    visiblePetType: normalizedVisiblePetType,
    petValidationConfidence:
      typeof petValidationConfidence === 'number'
        ? petValidationConfidence
        : null,
  };
}

export function isCloudPetValidationPassing(
  result: AiCaptionResult,
  expectedPetType: 'dog' | 'cat',
): boolean {
  if (!result.profilePetValid) {
    return false;
  }

  if (
    result.visiblePetType !== null &&
    result.visiblePetType !== expectedPetType
  ) {
    return false;
  }

  const validationConfidence =
    result.petValidationConfidence ?? result.confidence;

  if (validationConfidence === null) {
    return true;
  }

  return validationConfidence >= AI_CONFIDENCE_THRESHOLD;
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
