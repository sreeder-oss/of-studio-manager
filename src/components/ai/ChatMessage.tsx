import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, FileText } from 'lucide-react';
import type { ChatMessage as Msg } from '@/contexts/AIAssistantContext';
import { parseEstimateFromText } from '@/lib/estimateSchema';

interface Props {
  message: Msg;
  onOpenEstimate: (text: string) => void;
}

export const ChatMessage: React.FC<Props> = ({ message, onOpenEstimate }) => {
  const isUser = message.role === 'user';
  const hasEstimate = !isUser && !!parseEstimateFromText(message.content);
  // Hide raw json fenced block from rendered prose if estimate was extracted
  const display = hasEstimate
    ? message.content.replace(/```json\s*[\s\S]*?```/g, '').trim()
    : message.content;

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
          message.streaming ? <span className="inline-block w-2 h-3 bg-current animate-pulse" /> : null
        )}
        {hasEstimate && (
          <button
            onClick={() => onOpenEstimate(message.content)}
            className="mt-2 w-full bg-primary/10 border border-primary/30 text-primary rounded-lg px-3 py-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest hover:bg-primary/20 transition-colors"
          >
            <FileText size={12} /> Open estimate preview
          </button>
        )}
      </div>
    </div>
  );
};
