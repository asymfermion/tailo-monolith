import { parseAiCaptionResult, type AiCaptionResult } from '@tailo/shared';

import {
  buildCaptionEventPrompt,
  type CaptionEventPromptInput,
} from '../prompts/captionEvent.ts';
import { parseModelJsonResponse } from './stubCaptionProvider.ts';

const LOG_PREVIEW_CHARS = 800;
/** Thinking models (e.g. gemini-2.5-pro) need headroom beyond visible JSON. */
const MAX_OUTPUT_TOKENS_THINKING = 1024;
const MAX_OUTPUT_TOKENS_DEFAULT = 256;
/** Minimum allowed for gemini-2.5-pro; keeps reasoning short for captions. */
const GEMINI_25_PRO_THINKING_BUDGET = 128;

export function buildVertexGenerationConfig(
  model: string,
): Record<string, unknown> {
  const usesThinkingBudget = /gemini-2\.5-(pro|flash)/i.test(model);
  const config: Record<string, unknown> = {
    temperature: 0.4,
    maxOutputTokens: usesThinkingBudget
      ? MAX_OUTPUT_TOKENS_THINKING
      : MAX_OUTPUT_TOKENS_DEFAULT,
    responseMimeType: 'application/json',
  };

  if (/gemini-2\.5-pro/i.test(model)) {
    config.thinkingConfig = { thinkingBudget: GEMINI_25_PRO_THINKING_BUDGET };
  } else if (/gemini-2\.5-flash(?!-lite)/i.test(model)) {
    config.thinkingConfig = { thinkingBudget: 0 };
  }

  return config;
}

export type VertexCaptionConfig = {
  projectId: string;
  region: string;
  model: string;
  accessToken: string;
};

export type VertexCaptionInput = CaptionEventPromptInput & {
  imageBase64: string;
  mimeType?: string;
};

/** Included in Edge Function logs when caption JSON cannot be parsed. */
export type VertexCaptionParseDebug = {
  model: string;
  candidateCount: number;
  finishReason?: string;
  blockReason?: string;
  extractedTextLength: number;
  extractedTextPreview: string;
  responsePreview: string;
};

export type VertexCaptionError = {
  error: string;
  debug: VertexCaptionParseDebug;
};

export type VertexCaptionOutcome =
  | AiCaptionResult
  | VertexCaptionError
  | { error: string };

function preview(text: string, max = LOG_PREVIEW_CHARS): string {
  if (text.length <= max) {
    return text;
  }

  return `${text.slice(0, max)}…`;
}

type VertexGenerateContentResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
};

function extractCandidateText(payload: VertexGenerateContentResponse): string {
  return (
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('') ?? ''
  );
}

function buildParseDebug(
  config: VertexCaptionConfig,
  rawBody: string,
  payload: VertexGenerateContentResponse,
  extractedText: string,
): VertexCaptionParseDebug {
  const candidate = payload.candidates?.[0];

  return {
    model: config.model,
    candidateCount: payload.candidates?.length ?? 0,
    finishReason: candidate?.finishReason,
    blockReason: payload.promptFeedback?.blockReason,
    extractedTextLength: extractedText.length,
    extractedTextPreview: preview(extractedText),
    responsePreview: preview(rawBody),
  };
}

export async function generateVertexCaption(
  config: VertexCaptionConfig,
  input: VertexCaptionInput,
): Promise<VertexCaptionOutcome> {
  const prompt = buildCaptionEventPrompt(input);
  const url =
    `https://${config.region}-aiplatform.googleapis.com/v1/projects/${config.projectId}` +
    `/locations/${config.region}/publishers/google/models/${config.model}:generateContent`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: input.mimeType ?? 'image/jpeg',
                data: input.imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: buildVertexGenerationConfig(config.model),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    const detail = errorBody.slice(0, 400);

    return {
      error: detail
        ? `Vertex request failed (${response.status}): ${detail}`
        : `Vertex request failed (${response.status}).`,
    };
  }

  const rawBody = await response.text();
  let payload: VertexGenerateContentResponse;

  try {
    payload = JSON.parse(rawBody) as VertexGenerateContentResponse;
  } catch {
    return {
      error: 'Vertex response could not be parsed.',
      debug: {
        model: config.model,
        candidateCount: 0,
        extractedTextLength: 0,
        extractedTextPreview: '',
        responsePreview: preview(rawBody),
      },
    };
  }

  const finishReason = payload.candidates?.[0]?.finishReason;

  if (finishReason === 'MAX_TOKENS') {
    const extractedText = extractCandidateText(payload);

    return {
      error:
        'Vertex response truncated (MAX_TOKENS). For gemini-2.5-pro, thinking tokens count toward the output budget — prefer gemini-2.5-flash for captions.',
      debug: buildParseDebug(config, rawBody, payload, extractedText),
    };
  }

  const extractedText = extractCandidateText(payload);
  const parsed = parseModelJsonResponse(extractedText);

  if (!parsed) {
    return {
      error: 'Vertex response could not be parsed.',
      debug: buildParseDebug(config, rawBody, payload, extractedText),
    };
  }

  return parsed;
}
