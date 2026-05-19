import { parseAiCaptionResult, sanitizeAiCaption } from './ai-result';

describe('parseAiCaptionResult', () => {
  it('parses valid model output', () => {
    expect(
      parseAiCaptionResult({
        caption: 'A quiet afternoon',
        eventType: 'rest',
        confidence: 0.82,
      }),
    ).toEqual({
      caption: 'A quiet afternoon',
      eventType: 'rest',
      confidence: 0.82,
    });
  });

  it('rejects invalid event types', () => {
    expect(
      parseAiCaptionResult({
        caption: 'Hi',
        eventType: 'invalid',
        confidence: 0.5,
      }),
    ).toBeNull();
  });
});

describe('sanitizeAiCaption', () => {
  it('blocks medical phrasing', () => {
    expect(sanitizeAiCaption('Possible diagnosis for your pet')).toBeNull();
  });
});
