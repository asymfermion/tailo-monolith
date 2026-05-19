import { describe, expect, it } from 'vitest';

import { applyAiResultToEvent } from './applyAiResultToEvent';

describe('applyAiResultToEvent', () => {
  it('applies ai caption when confidence is high enough', () => {
    expect(
      applyAiResultToEvent(
        {
          caption: null,
          eventType: 'unknown',
          captionSource: 'placeholder',
          userEditedCaption: false,
          userEditedEventType: false,
        },
        {
          caption: 'A sunny nap',
          eventType: 'rest',
          confidence: 0.9,
          profilePetValid: true,
          visiblePetType: 'dog',
          petValidationConfidence: 0.9,
        },
      ),
    ).toEqual({
      caption: 'A sunny nap',
      eventType: 'rest',
      captionSource: 'ai',
    });
  });

  it('does not overwrite user-edited caption', () => {
    expect(
      applyAiResultToEvent(
        {
          caption: 'My note',
          eventType: 'play',
          captionSource: 'user',
          userEditedCaption: true,
          userEditedEventType: false,
        },
        {
          caption: 'Ignored',
          eventType: 'rest',
          confidence: 0.95,
          profilePetValid: true,
          visiblePetType: 'dog',
          petValidationConfidence: 0.95,
        },
      ),
    ).toEqual({
      caption: 'My note',
      eventType: 'rest',
      captionSource: 'user',
    });
  });

  it('uses placeholder when confidence is low', () => {
    expect(
      applyAiResultToEvent(
        {
          caption: null,
          eventType: 'unknown',
          captionSource: 'placeholder',
          userEditedCaption: false,
          userEditedEventType: false,
        },
        {
          caption: 'Maybe something',
          eventType: 'walk',
          confidence: 0.2,
          profilePetValid: true,
          visiblePetType: 'dog',
          petValidationConfidence: 0.2,
        },
      ),
    ).toEqual({
      caption: null,
      eventType: 'unknown',
      captionSource: 'placeholder',
    });
  });
});
