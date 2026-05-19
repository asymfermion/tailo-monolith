import { afterEach, describe, expect, it, vi } from 'vitest';

import { parseModelJsonResponse } from './stubCaptionProvider';
import {
  buildVertexGenerationConfig,
  generateVertexCaption,
} from './vertexCaptionProvider';

const config = {
  projectId: 'test-project',
  region: 'us-central1',
  model: 'gemini-2.5-pro',
  accessToken: 'token',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('buildVertexGenerationConfig', () => {
  it('raises output budget and caps thinking for gemini-2.5-pro', () => {
    expect(buildVertexGenerationConfig('gemini-2.5-pro')).toEqual({
      temperature: 0.4,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 128 },
    });
  });

  it('disables thinking for gemini-2.5-flash (Tailo default)', () => {
    expect(buildVertexGenerationConfig('gemini-2.5-flash')).toEqual({
      temperature: 0.4,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 0 },
    });
  });

  it('uses default output budget for non-2.5 models', () => {
    expect(buildVertexGenerationConfig('gemini-3.1-flash-lite')).toEqual({
      temperature: 0.4,
      maxOutputTokens: 256,
      responseMimeType: 'application/json',
    });
  });
});

describe('parseModelJsonResponse', () => {
  it('parses JSON inside markdown code fences', () => {
    expect(
      parseModelJsonResponse(
        'Here is the JSON:\n```json\n{"caption":"Nap time","eventType":"rest","confidence":0.8,"profilePetValid":true,"visiblePetType":"dog","petValidationConfidence":0.8}\n```',
      ),
    ).toEqual({
      caption: 'Nap time',
      eventType: 'rest',
      confidence: 0.8,
      profilePetValid: true,
      visiblePetType: 'dog',
      petValidationConfidence: 0.8,
    });
  });
});

describe('generateVertexCaption', () => {
  it('returns debug payload when model text is not valid caption JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({
            candidates: [
              {
                finishReason: 'STOP',
                content: {
                  parts: [{ text: 'Here is a caption without JSON braces' }],
                },
              },
            ],
          }),
      }),
    );

    const result = await generateVertexCaption(config, {
      petType: 'dog',
      eventSource: 'camera_roll',
      timestamp: '2026-05-19T12:00:00.000Z',
      imageBase64: 'abc',
    });

    expect(result).toMatchObject({
      error: 'Vertex response could not be parsed.',
      debug: {
        model: 'gemini-2.5-pro',
        candidateCount: 1,
        finishReason: 'STOP',
        extractedTextPreview: expect.stringContaining('caption without JSON'),
      },
    });
  });

  it('returns a clear error when finishReason is MAX_TOKENS', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({
            candidates: [
              {
                finishReason: 'MAX_TOKENS',
                content: {
                  parts: [{ text: 'Here is the JSON requested:\n```' }],
                },
              },
            ],
          }),
      }),
    );

    const result = await generateVertexCaption(config, {
      petType: 'dog',
      eventSource: 'camera_roll',
      timestamp: '2026-05-19T12:00:00.000Z',
      imageBase64: 'abc',
    });

    expect(result).toMatchObject({
      error: expect.stringContaining('MAX_TOKENS'),
      debug: { finishReason: 'MAX_TOKENS' },
    });
  });

  it('returns debug when response body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => 'not json',
      }),
    );

    const result = await generateVertexCaption(config, {
      petType: 'cat',
      eventSource: 'in_app',
      timestamp: '2026-05-19T12:00:00.000Z',
      imageBase64: 'abc',
    });

    expect(result).toMatchObject({
      error: 'Vertex response could not be parsed.',
      debug: {
        candidateCount: 0,
        responsePreview: 'not json',
      },
    });
  });
});
