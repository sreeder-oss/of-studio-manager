// Model catalog for the AI assistant.
// Configured exclusively for DeepSeek V4.1 Flash.

export interface AIModelOption {
  /** Model slug sent to the edge function. */
  id: string;
  /** Short label for the display. */
  label: string;
  /** Provider tag. */
  provider: 'DeepSeek';
  /** One-line strength description for the tooltip / help text. */
  blurb: string;
  /** True = routes through OpenRouter; false = direct DeepSeek API. */
  openrouter: boolean;
}

export const AI_MODELS: AIModelOption[] = [
  {
    id: 'deepseek/deepseek-v4.1-flash',
    label: 'DeepSeek V4.1 Flash',
    provider: 'DeepSeek',
    blurb: 'Next-generation multimodal MoE with native visual understanding, long-horizon tool execution, and accurate trade estimating.',
    openrouter: true,
  },
];

export const DEFAULT_AI_MODEL_ID = 'deepseek/deepseek-v4.1-flash';
export const AI_MODEL_STORAGE_KEY = 'of-ai-model';
export const DEEPSEEK_KEY_STORAGE_KEY = 'of-deepseek-api-key';

export function getStoredModelId(): string {
  if (typeof window === 'undefined') return DEFAULT_AI_MODEL_ID;
  const v = window.localStorage.getItem(AI_MODEL_STORAGE_KEY);
  if (v && AI_MODELS.some((m) => m.id === v)) return v;
  return DEFAULT_AI_MODEL_ID;
}

export function setStoredModelId(id: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(AI_MODEL_STORAGE_KEY, id);
}

export function getStoredDeepSeekKey(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(DEEPSEEK_KEY_STORAGE_KEY) || '';
}

export function setStoredDeepSeekKey(key: string) {
  if (typeof window === 'undefined') return;
  const trimmed = key.trim();
  if (!trimmed) {
    window.localStorage.removeItem(DEEPSEEK_KEY_STORAGE_KEY);
  } else {
    window.localStorage.setItem(DEEPSEEK_KEY_STORAGE_KEY, trimmed);
  }
}
