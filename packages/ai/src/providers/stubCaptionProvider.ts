import { parseAiCaptionResult, type AiCaptionResult } from '@tailo/shared';

import type { CaptionEventPromptInput } from '../prompts/captionEvent.ts';

/** Dev/test provider until Vertex credentials are configured. */
export function generateStubCaption(
  input: CaptionEventPromptInput,
): AiCaptionResult {
  const caption =
    input.petType === 'cat'
      ? 'A quiet moment together.'
      : 'A small moment from the day.';

  return {
    caption,
    eventType: 'unknown',
    confidence: 0.72,
    profilePetValid: true,
    visiblePetType: input.petType,
    petValidationConfidence: 0.9,
  };
}

function stripMarkdownCodeFence(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);

  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  return text;
}

export function parseModelJsonResponse(text: string): AiCaptionResult | null {
  const trimmed = stripMarkdownCodeFence(text.trim());
  const jsonStart = trimmed.indexOf('{');
  const jsonEnd = trimmed.lastIndexOf('}');

  if (jsonStart === -1 || jsonEnd === -1) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1));
    return parseAiCaptionResult(parsed);
  } catch {
    return null;
  }
}
