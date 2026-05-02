// Model catalog for the AI assistant. The edge function whitelists OpenRouter slugs;
// keep these in sync with OPENROUTER_MODELS in supabase/functions/ai-chat/index.ts.

export interface AIModelOption {
  /** Model slug sent to the edge function. */
  id: string;
  /** Short label for the dropdown. */
  label: string;
  /** Provider tag (UI only). */
  provider: 'OpenAI' | 'Anthropic' | 'Google' | 'xAI';
  /** One-line strength description for the tooltip / help text. */
  blurb: string;
  /** True = routes through OpenRouter; false = Lovable AI gateway. */
  openrouter: boolean;
}

export const AI_MODELS: AIModelOption[] = [
  {
    id: 'openai/gpt-5',
    label: 'GPT-5 (high reasoning)',
    provider: 'OpenAI',
    blurb: 'Best all-rounder. Sharp reasoning, vision, and tool use. Default.',
    openrouter: false, // available via Lovable AI
  },
  {
    id: 'anthropic/claude-opus-4.5',
    label: 'Claude Opus 4.5',
    provider: 'Anthropic',
    blurb: 'Most careful with long instructions. Excellent at nuanced trade work and estimates.',
    openrouter: true,
  },
  {
    id: 'anthropic/claude-sonnet-4.5',
    label: 'Claude Sonnet 4.5',
    provider: 'Anthropic',
    blurb: 'Faster Claude, still very accurate. Good daily driver.',
    openrouter: true,
  },
  {
    id: 'google/gemini-3-pro-preview',
    label: 'Gemini 3 Pro',
    provider: 'Google',
    blurb: 'Massive context, strong vision (great for plan drawings).',
    openrouter: true,
  },
  {
    id: 'openai/gpt-5-pro',
    label: 'GPT-5 Pro',
    provider: 'OpenAI',
    blurb: 'GPT-5 with extended thinking. Slowest, most thorough.',
    openrouter: true,
  },
  {
    id: 'x-ai/grok-4',
    label: 'Grok 4',
    provider: 'xAI',
    blurb: 'Fast, candid, good at on-the-fly research.',
    openrouter: true,
  },
];

export const DEFAULT_AI_MODEL_ID = 'openai/gpt-5';
export const AI_MODEL_STORAGE_KEY = 'of-ai-model';

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
