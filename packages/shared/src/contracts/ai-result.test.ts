import {
  isCloudPetValidationPassing,
  parseAiCaptionResult,
  sanitizeAiCaption,
} from './ai-result';

describe('parseAiCaptionResult', () => {
  it('parses valid model output', () => {
    expect(
      parseAiCaptionResult({
        caption: 'A quiet afternoon',
        eventType: 'rest',
        confidence: 0.82,
        profilePetValid: true,
        visiblePetType: 'dog',
        petValidationConfidence: 0.82,
      }),
    ).toEqual({
      caption: 'A quiet afternoon',
      eventType: 'rest',
      confidence: 0.82,
      profilePetValid: true,
      visiblePetType: 'dog',
      petValidationConfidence: 0.82,
    });
  });

  it('coerces visiblePetType string "null" to null', () => {
    expect(
      parseAiCaptionResult({
        caption: 'A cow on a hill',
        eventType: 'unknown',
        confidence: 0,
        profilePetValid: false,
        visiblePetType: 'null',
        petValidationConfidence: 0,
      }),
    ).toEqual({
      caption: 'A cow on a hill',
      eventType: 'unknown',
      confidence: 0,
      profilePetValid: false,
      visiblePetType: null,
      petValidationConfidence: 0,
    });
  });

  it('rejects invalid event types', () => {
    expect(
      parseAiCaptionResult({
        caption: 'Hi',
        eventType: 'invalid',
        confidence: 0.5,
        profilePetValid: true,
        visiblePetType: null,
        petValidationConfidence: 0.5,
      }),
    ).toBeNull();
  });
});

describe('isCloudPetValidationPassing', () => {
  const base = {
    caption: 'x',
    eventType: 'unknown' as const,
    confidence: 0.9,
    visiblePetType: 'dog' as const,
    petValidationConfidence: 0.9,
  };

  it('rejects when profilePetValid is false', () => {
    expect(
      isCloudPetValidationPassing({ ...base, profilePetValid: false }, 'dog'),
    ).toBe(false);
  });

  it('rejects when profilePetValid is false even with high confidence', () => {
    expect(
      isCloudPetValidationPassing(
        {
          ...base,
          profilePetValid: false,
          visiblePetType: null,
          petValidationConfidence: 0.9,
        },
        'dog',
      ),
    ).toBe(false);
  });

  it('rejects when visible pet type mismatches profile', () => {
    expect(
      isCloudPetValidationPassing(
        { ...base, profilePetValid: true, visiblePetType: 'cat' },
        'dog',
      ),
    ).toBe(false);
  });
});

describe('sanitizeAiCaption', () => {
  it('blocks medical phrasing', () => {
    expect(sanitizeAiCaption('Possible diagnosis for your pet')).toBeNull();
  });
});
