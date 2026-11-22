import React from 'react';
import { Brain } from 'lucide-react';
import { AI_MODELS } from '@/lib/aiModels';
import { useAIAssistant } from '@/contexts/AIAssistantContext';

export const ModelPicker: React.FC = () => {
  const { modelId } = useAIAssistant();
  const current = AI_MODELS.find((m) => m.id === modelId) ?? AI_MODELS[0];

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-card border border-border text-[10px] font-bold uppercase tracking-wider text-foreground/90 shadow-xs">
      <Brain size={12} className="text-primary" />
      <span className="truncate max-w-[150px] font-mono">{current.label}</span>
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Active Engine" />
    </div>
  );
};
