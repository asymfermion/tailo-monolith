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
    'Respond with JSON only: {"caption":"...","eventType":"walk|play|rest|eating|unknown","confidence":0.0}',
  ].join('\n');
}

export const ALLOWED_CAPTION_EVENT_TYPES: EventType[] = [
  'walk',
  'play',
  'rest',
  'eating',
  'unknown',
];
