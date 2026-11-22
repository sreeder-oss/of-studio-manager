// Model catalog for the AI assistant. The edge function whitelists OpenRouter slugs;
// keep these in sync with OPENROUTER_MODELS in supabase/functions/ai-chat/index.ts.

export interface AIModelOption {
  /** Model slug sent to the edge function. */
  id: string;
  /** Short label for the dropdown. */
  label: string;
  /** Provider tag (UI only). */
  provider: 'OpenAI' | 'Anthropic' | 'Google' | 'xAI' | 'DeepSeek';
  /** One-line strength description for the tooltip / help text. */
  blurb: string;
  /** True = routes through OpenRouter; false = Lovable AI gateway. */
  openrouter: boolean;
}

export const AI_MODELS: AIModelOption[] = [
  {
    id: 'anthropic/claude-sonnet-4.5',
    label: 'Claude Sonnet 4.5',
    provider: 'Anthropic',
    blurb: 'Fast, intelligent, best at trade estimates, formulas, and scope extraction. Recommended default.',
    openrouter: true,
  },
  {
    id: 'anthropic/claude-opus-4.5',
    label: 'Claude Opus 4.5',
    provider: 'Anthropic',
    blurb: 'Deepest reasoning for complex multi-page architectural specifications and blueprints.',
    openrouter: true,
  },
  {
    id: 'openai/gpt-4o',
    label: 'GPT-4o',
    provider: 'OpenAI',
    blurb: 'Strong general reasoning, vision, and tool calling.',
    openrouter: true,
  },
  {
    id: 'google/gemini-2.0-flash-001',
    label: 'Gemini 2.0 Flash',
    provider: 'Google',
    blurb: 'Ultra fast responses and vision recognition for receipts and drawings.',
    openrouter: true,
  },
  {
    id: 'deepseek/deepseek-chat',
    label: 'DeepSeek V3',
    provider: 'DeepSeek',
    blurb: 'Cost-efficient daily driver with strong analytical skills.',
    openrouter: true,
  },
];

export const DEFAULT_AI_MODEL_ID = 'anthropic/claude-sonnet-4.5';
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
