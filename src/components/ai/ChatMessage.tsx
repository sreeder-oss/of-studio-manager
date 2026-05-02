import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, FileText } from 'lucide-react';
import type { ChatMessage as Msg } from '@/contexts/AIAssistantContext';
import { parseEstimateFromText } from '@/lib/estimateSchema';
import { parseActionsFromText, stripActionBlocks } from '@/lib/actionSchema';
import { ActionCard } from './ActionCard';
import { useAIAssistant } from '@/contexts/AIAssistantContext';

interface Props {
  message: Msg;
  onOpenEstimate: (text: string) => void;
}

export const ChatMessage: React.FC<Props> = ({ message, onOpenEstimate }) => {
  const { markActionApplied } = useAIAssistant();
  const isUser = message.role === 'user';
  const hasEstimate = !isUser && !!parseEstimateFromText(message.content);
  const actions = isUser ? [] : parseActionsFromText(message.content);

  // Hide raw fenced blocks from prose
  let display = message.content;
  if (hasEstimate) display = display.replace(/```json\s*[\s\S]*?```/g, '').trim();
  if (actions.length > 0) display = stripActionBlocks(display);

  return (
    <div className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
          <Sparkles size={14} />
        </div>
      )}
      <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-[12px] leading-relaxed ${
        isUser ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-foreground'
      }`}>
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex gap-1.5 mb-1.5 flex-wrap">
            {message.attachments.map((a, i) => (
              <img key={i} src={a.dataUrl} alt={a.name} className="h-16 w-16 object-cover rounded-lg border border-border" />
            ))}
          </div>
        )}
        {display ? (
          <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0">
            <ReactMarkdown>{display}</ReactMarkdown>
          </div>
        ) : (
          message.streaming && actions.length === 0 ? <span className="inline-block w-2 h-3 bg-current animate-pulse" /> : null
        )}
        {hasEstimate && (
          <button
            onClick={() => onOpenEstimate(message.content)}
            className="mt-2 w-full bg-primary/10 border border-primary/30 text-primary rounded-lg px-3 py-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest hover:bg-primary/20 transition-colors"
          >
            <FileText size={12} /> Open estimate preview
          </button>
        )}
        {actions.map((p) => (
          <ActionCard
            key={p.id}
            parsed={p}
            applied={!!message.appliedActions?.includes(p.id)}
            onApplied={(id) => markActionApplied(message.id, id)}
          />
        ))}
      </div>
    </div>
  );
};
