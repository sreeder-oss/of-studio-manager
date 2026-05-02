import React, { useState } from 'react';
import { Brain, Check, ChevronDown } from 'lucide-react';
import { AI_MODELS } from '@/lib/aiModels';
import { useAIAssistant } from '@/contexts/AIAssistantContext';

export const ModelPicker: React.FC = () => {
  const { modelId, setModelId } = useAIAssistant();
  const [open, setOpen] = useState(false);
  const current = AI_MODELS.find((m) => m.id === modelId) ?? AI_MODELS[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-card border border-border hover:border-primary/50 text-[10px] font-bold uppercase tracking-widest text-foreground/80"
      >
        <Brain size={11} className="text-primary" />
        <span className="truncate max-w-[140px]">{current.label}</span>
        <ChevronDown size={11} className="text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-72 bg-card border border-border rounded-lg shadow-xl p-1.5 max-h-[60vh] overflow-y-auto">
            {AI_MODELS.map((m) => {
              const active = m.id === modelId;
              return (
                <button
                  key={m.id}
                  onClick={() => { setModelId(m.id); setOpen(false); }}
                  className={`w-full text-left p-2 rounded-md transition-colors ${active ? 'bg-primary/10' : 'hover:bg-accent'}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-[12px] font-bold text-foreground">{m.label}</span>
                    {active && <Check size={12} className="text-primary shrink-0" />}
                  </div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-primary">{m.provider}</span>
                    <span className="text-[9px] text-muted-foreground">
                      via {m.openrouter ? 'OpenRouter' : 'Lovable AI'}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">{m.blurb}</p>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
