import React from 'react';
import { Sparkles } from 'lucide-react';
import { useAIAssistantOptional } from '@/contexts/AIAssistantContext';

export const FloatingAIButton: React.FC = () => {
  const ctx = useAIAssistantOptional();
  if (!ctx || ctx.open) return null;
  const { setOpen } = ctx;
  return (
    <button
      onClick={() => setOpen(true)}
      aria-label="Open AI Assistant"
      className="fixed right-4 bottom-20 z-40 h-14 w-14 rounded-full flex items-center justify-center shadow-soft text-white transition-transform hover:scale-105 active:scale-95"
      style={{
        background: 'linear-gradient(135deg, #BA7517, #d68a26)',
        boxShadow: '0 8px 24px -6px rgba(186, 117, 23, 0.55), 0 0 0 1px rgba(255,255,255,0.08) inset',
      }}
    >
      <Sparkles size={22} />
    </button>
  );
};
