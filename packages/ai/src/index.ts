export {
  buildCaptionEventPrompt,
  type CaptionEventPromptInput,
} from './prompts/captionEvent';
export {
  pickPlaceholderCaption,
  resolveDisplayCaption,
} from './fallbackCaptions';
export {
  generateStubCaption,
  parseModelJsonResponse,
} from './providers/stubCaptionProvider';
export {
  buildVertexGenerationConfig,
  generateVertexCaption,
  type VertexCaptionConfig,
  type VertexCaptionError,
  type VertexCaptionInput,
  type VertexCaptionOutcome,
  type VertexCaptionParseDebug,
} from './providers/vertexCaptionProvider';
