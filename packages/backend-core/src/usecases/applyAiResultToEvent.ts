import {
  AI_CONFIDENCE_THRESHOLD,
  sanitizeAiCaption,
  type AiCaptionResult,
} from '@tailo/shared';

export type EventAiTarget = {
  caption: string | null;
  eventType: AiCaptionResult['eventType'];
  captionSource: 'user' | 'ai' | 'placeholder' | null;
  userEditedCaption: boolean;
  userEditedEventType: boolean;
};

export type AppliedAiResult = {
  caption: string | null;
  eventType: AiCaptionResult['eventType'];
  captionSource: 'user' | 'ai' | 'placeholder';
};

export function applyAiResultToEvent(
  event: EventAiTarget,
  result: AiCaptionResult,
): AppliedAiResult {
  const safeCaption = sanitizeAiCaption(result.caption);
  const confidence = result.confidence ?? 0;
  const lowConfidence = confidence < AI_CONFIDENCE_THRESHOLD;

  const nextCaption = event.userEditedCaption
    ? event.caption
    : lowConfidence
      ? null
      : safeCaption;

  const nextEventType = event.userEditedEventType
    ? event.eventType
    : lowConfidence
      ? 'unknown'
      : result.eventType;

  let captionSource: 'user' | 'ai' | 'placeholder' =
    event.captionSource ?? 'placeholder';

  if (!event.userEditedCaption) {
    if (lowConfidence || !nextCaption) {
      captionSource = 'placeholder';
    } else {
      captionSource = 'ai';
    }
  }

  return {
    caption: nextCaption,
    eventType: nextEventType,
    captionSource,
  };
}
