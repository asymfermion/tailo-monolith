import { parseAiCaptionResult, type AiCaptionResult } from '@tailo/shared';

import {
  buildCaptionEventPrompt,
  type CaptionEventPromptInput,
} from '../prompts/captionEvent.ts';
import { parseModelJsonResponse } from './stubCaptionProvider.ts';

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

export async function generateVertexCaption(
  config: VertexCaptionConfig,
  input: VertexCaptionInput,
): Promise<AiCaptionResult | { error: string }> {
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
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 256,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    return {
      error: `Vertex request failed (${response.status}).`,
    };
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const text =
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('') ?? '';

  const parsed = parseModelJsonResponse(text);

  if (!parsed) {
    return { error: 'Vertex response could not be parsed.' };
  }

  return parsed;
}
