import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, FileText, CheckCheck, Loader2 } from 'lucide-react';
import type { ChatMessage as Msg } from '@/contexts/AIAssistantContext';
import { parseEstimateFromText } from '@/lib/estimateSchema';
import { parseInvoiceFromText } from '@/lib/invoiceSchema';
import { parseScopeFromText } from '@/lib/scopeSchema';
import { parseActionsFromText, parseActionFailures, stripActionBlocks } from '@/lib/actionSchema';
import { ActionCard } from './ActionCard';
import { useAIAssistant } from '@/contexts/AIAssistantContext';
import { useAIActions } from '@/hooks/useAIActions';

interface Props {
  message: Msg;
  onOpenEstimate: (text: string) => void;
  onOpenInvoice: (text: string) => void;
}

export const ChatMessage: React.FC<Props> = ({ message, onOpenEstimate, onOpenInvoice }) => {
  const { markActionApplied } = useAIAssistant();
  const { run } = useAIActions();
  const [applyingAll, setApplyingAll] = useState(false);

  const isUser = message.role === 'user';
  const hasEstimate = !isUser && (!!parseScopeFromText(message.content) || !!parseEstimateFromText(message.content));
  const hasInvoice = !isUser && !hasEstimate && !!parseInvoiceFromText(message.content);
  const actions = isUser ? [] : parseActionsFromText(message.content);
  const failedActions = isUser || message.streaming ? [] : parseActionFailures(message.content);

  const pendingContactActions = actions.filter(
    (p) =>
      (p.action.type === 'create_contact' || p.action.type === 'update_contact') &&
      !message.appliedActions?.includes(p.id),
  );

  const handleApplyAllContacts = async () => {
    if (applyingAll || pendingContactActions.length === 0) return;
    setApplyingAll(true);
    try {
      for (const p of pendingContactActions) {
        const ok = await run(p.action);
        if (ok) markActionApplied(message.id, p.id);
      }
    } finally {
      setApplyingAll(false);
    }
  };

  // Hide raw fenced blocks from prose
  let display = message.content;
  if (hasEstimate || hasInvoice) display = display.replace(/```json\s*[\s\S]*?```/g, '').trim();
  if (actions.length > 0 || failedActions.length > 0) display = stripActionBlocks(display);

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
              a.kind === 'pdf' ? (
                <div key={i} className="h-16 px-2 rounded-lg border border-border bg-background/40 flex items-center gap-1.5 text-[10px]">
                  <FileText size={14} className="text-primary" />
                  <span className="truncate max-w-[120px]">{a.name}</span>
                </div>
              ) : (
                <img key={i} src={a.dataUrl} alt={a.name} className="h-16 w-16 object-cover rounded-lg border border-border" />
              )
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
        {hasInvoice && (
          <button
            onClick={() => onOpenInvoice(message.content)}
            className="mt-2 w-full bg-primary/10 border border-primary/30 text-primary rounded-lg px-3 py-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest hover:bg-primary/20 transition-colors"
          >
            <FileText size={12} /> Open invoice preview
          </button>
        )}
        {failedActions.map((f) => (
          <div key={f.id} className="mt-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px]">
            <p className="font-bold text-destructive">Action could not be read{f.type ? ` (${f.type})` : ''}</p>
            <p className="text-muted-foreground mt-0.5 break-words">{f.reason}</p>
          </div>
        ))}
        {!message.streaming && pendingContactActions.length >= 2 && (
          <button
            type="button"
            disabled={applyingAll}
            onClick={handleApplyAllContacts}
            className="mt-2 w-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25 rounded-lg px-3 py-2 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
          >
            {applyingAll ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={13} />}
            {applyingAll ? 'Saving leads…' : `Save All Verified Leads (${pendingContactActions.length})`}
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
