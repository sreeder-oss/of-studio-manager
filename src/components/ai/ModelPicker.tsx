import React, { useState } from 'react';
import { Brain, Check, ChevronDown, ShieldCheck } from 'lucide-react';
import { AI_MODELS } from '@/lib/aiModels';
import { useAIAssistant } from '@/contexts/AIAssistantContext';

export const ModelPicker: React.FC = () => {
  const { modelId, setModelId } = useAIAssistant();
  const [open, setOpen] = useState(false);
  const current = AI_MODELS.find((m) => m.id === modelId) ?? AI_MODELS[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-card border border-border hover:border-primary/50 text-[10px] font-bold uppercase tracking-wider text-foreground/90 shadow-xs transition-colors"
        title="Switch between Primary (DeepSeek V4.1 Flash) and Backup (Gemma 4 31B)"
      >
        <Brain size={12} className="text-primary shrink-0" />
        <span className="truncate max-w-[140px] font-mono">{current.label}</span>
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
        <ChevronDown size={11} className="text-muted-foreground shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-72 bg-card border border-border rounded-lg shadow-xl p-1.5 space-y-1">
            {AI_MODELS.map((m) => {
              const active = m.id === current.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setModelId(m.id);
                    setOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-md transition-colors ${
                    active ? 'bg-primary/10 border border-primary/30' : 'hover:bg-accent border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-foreground">{m.label}</span>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        m.role === 'Primary'
                          ? 'bg-primary/20 text-primary'
                          : 'bg-accent text-muted-foreground'
                      }`}>
                        {m.role}
                      </span>
                    </div>
                    {active && <Check size={12} className="text-primary shrink-0" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">{m.blurb}</p>
                </button>
              );
            })}
            <div className="px-2 pt-1.5 pb-1 border-t border-border/60 flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <ShieldCheck size={11} className="text-emerald-500 shrink-0" />
              <span>Auto-fallback to Gemma 4 31B if DeepSeek fails</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
