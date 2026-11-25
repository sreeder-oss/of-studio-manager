// Model catalog for the AI assistant.
// Primary: DeepSeek V4.1 Flash | Backup: Google Gemma 4 31B (via OpenRouter).

export interface AIModelOption {
  /** Model slug sent to the edge function. */
  id: string;
  /** Short label for the dropdown & badge. */
  label: string;
  /** Provider tag. */
  provider: 'DeepSeek' | 'Google';
  /** Role badge shown in Settings & ModelPicker. */
  role: 'Primary' | 'Backup';
  /** One-line strength description for the tooltip / help text. */
  blurb: string;
  /** True = routes through OpenRouter; false = direct provider API. */
  openrouter: boolean;
}

export const AI_MODELS: AIModelOption[] = [
  {
    id: 'deepseek/deepseek-v4.1-flash',
    label: 'DeepSeek V4.1 Flash',
    provider: 'DeepSeek',
    role: 'Primary',
    blurb: 'Next-gen multimodal MoE with native vision, fast KV caching, and top-tier trade estimating & blueprint extraction.',
    openrouter: true,
  },
  {
    id: 'google/gemma-4-31b-it',
    label: 'Gemma 4 31B',
    provider: 'Google',
    role: 'Backup',
    blurb: 'Reliable multimodal backup with 256K context, native tool calling, and vision. Auto-activates if DeepSeek is unavailable.',
    openrouter: true,
  },
];

export const DEFAULT_AI_MODEL_ID = 'deepseek/deepseek-v4.1-flash';
export const BACKUP_AI_MODEL_ID = 'google/gemma-4-31b-it';
export const AI_MODEL_STORAGE_KEY = 'of-ai-model';
export const DEEPSEEK_KEY_STORAGE_KEY = 'of-deepseek-api-key';
export const GEMMA_KEY_STORAGE_KEY = 'of-gemma-api-key';

export interface VisualizerModelOption {
  id: string;
  label: string;
  endpoint: 'images' | 'chat';
  blurb: string;
}

export const VISUALIZER_MODELS: VisualizerModelOption[] = [
  {
    id: 'bytedance-seed/seedream-5-0-lite',
    label: 'Seedream 5.0 Lite',
    endpoint: 'images',
    blurb: 'Dedicated image editing & multi-reference generation (~$0.035/image, 2K–4K).',
  },
  {
    id: 'google/gemini-2.5-flash-image-preview',
    label: 'Gemini 2.5 Flash Image (Preview)',
    endpoint: 'chat',
    blurb: 'Multimodal image-edit fallback via OpenRouter Chat API.',
  },
  {
    id: 'google/gemini-2.5-flash-image',
    label: 'Gemini 2.5 Flash Image',
    endpoint: 'chat',
    blurb: 'Stable Gemini image-edit fallback via OpenRouter Chat API.',
  },
];

export const DEFAULT_VISUALIZER_MODEL_ID = 'bytedance-seed/seedream-5-0-lite';
export const VISUALIZER_MODEL_STORAGE_KEY = 'of-visualizer-model';
export const VISUALIZER_KEY_STORAGE_KEY = 'of-visualizer-api-key';

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

export function getStoredBackupKey(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(GEMMA_KEY_STORAGE_KEY) || '';
}

export function setStoredBackupKey(key: string) {
  if (typeof window === 'undefined') return;
  const trimmed = key.trim();
  if (!trimmed) {
    window.localStorage.removeItem(GEMMA_KEY_STORAGE_KEY);
  } else {
    window.localStorage.setItem(GEMMA_KEY_STORAGE_KEY, trimmed);
  }
}

export function getStoredVisualizerModel(): string {
  if (typeof window === 'undefined') return DEFAULT_VISUALIZER_MODEL_ID;
  const v = window.localStorage.getItem(VISUALIZER_MODEL_STORAGE_KEY);
  if (v && VISUALIZER_MODELS.some((m) => m.id === v)) return v;
  return DEFAULT_VISUALIZER_MODEL_ID;
}

export function setStoredVisualizerModel(id: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(VISUALIZER_MODEL_STORAGE_KEY, id);
}

export function getStoredVisualizerKey(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(VISUALIZER_KEY_STORAGE_KEY) || '';
}

export function setStoredVisualizerKey(key: string) {
  if (typeof window === 'undefined') return;
  const trimmed = key.trim();
  if (!trimmed) {
    window.localStorage.removeItem(VISUALIZER_KEY_STORAGE_KEY);
  } else {
    window.localStorage.setItem(VISUALIZER_KEY_STORAGE_KEY, trimmed);
  }
}
