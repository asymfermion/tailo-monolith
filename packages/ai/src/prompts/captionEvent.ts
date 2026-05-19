import type { EventType } from '@tailo/shared';

export type CaptionEventPromptInput = {
  petType: 'dog' | 'cat';
  eventSource: 'camera_roll' | 'in_app' | 'manual';
  timestamp: string;
};

export function buildCaptionEventPrompt(
  input: CaptionEventPromptInput,
): string {
  return [
    'You write short, calm pet memory captions for a private timeline.',
    'Rules:',
    '- Max 280 characters.',
    '- No medical or diagnostic language.',
    '- Do not mention AI, models, or being an assistant.',
    '- Do not invent locations, people, or names.',
    '- Prefer gentle observational tone.',
    `Pet type: ${input.petType}.`,
    `Moment source: ${input.eventSource}.`,
    `Timestamp: ${input.timestamp}.`,
    'Output ONLY one JSON object (no markdown, no code fences, no preamble).',
    'Set profilePetValid true only if a ' +
      input.petType +
      ' is clearly the main subject (not another animal, not empty scene).',
    'Use JSON null for visiblePetType when no dog or cat is the main subject (never the string "null").',
    'Shape: {"caption":"...","eventType":"walk|play|rest|eating|unknown","confidence":0.0,"profilePetValid":true,"visiblePetType":"dog","petValidationConfidence":0.0}',
  ].join('\n');
}

export const ALLOWED_CAPTION_EVENT_TYPES: EventType[] = [
  'walk',
  'play',
  'rest',
  'eating',
  'unknown',
];
