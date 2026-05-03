import React, { useState } from 'react';
import { Plus, MessageSquare, Trash2, X, History } from 'lucide-react';
import { useAIAssistant } from '@/contexts/AIAssistantContext';

const formatWhen = (ts: number) => {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export const ChatHistoryPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const {
    conversations, activeConversationId,
    newConversation, switchConversation, deleteConversation, renameConversation,
  } = useAIAssistant();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');

  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="absolute inset-0 z-20 bg-background flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <History size={11} className="text-primary" /> Recent chats
        </div>
        <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent">
          <X size={14} />
        </button>
      </div>
      <div className="p-2">
        <button
          onClick={() => { newConversation(); onClose(); }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary text-[11px] font-bold uppercase tracking-widest hover:bg-primary/20 transition-colors"
        >
          <Plus size={14} /> New chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1 no-scrollbar">
        {sorted.length === 0 && (
          <p className="text-[11px] text-muted-foreground text-center py-6">No chats yet.</p>
        )}
        {sorted.map((c) => {
          const isActive = c.id === activeConversationId;
          const preview = c.messages.length > 0
            ? `${c.messages.length} message${c.messages.length === 1 ? '' : 's'}`
            : 'Empty';
          return (
            <div
              key={c.id}
              className={`group rounded-lg px-2.5 py-2 border transition-colors cursor-pointer ${
                isActive ? 'bg-primary/10 border-primary/40' : 'bg-card border-border hover:border-primary/30'
              }`}
              onClick={() => { switchConversation(c.id); onClose(); }}
            >
              <div className="flex items-start gap-2">
                <MessageSquare size={12} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  {renamingId === c.id ? (
                    <input
                      autoFocus
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={() => { renameConversation(c.id, draftTitle); setRenamingId(null); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { renameConversation(c.id, draftTitle); setRenamingId(null); }
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      className="w-full bg-background border border-border rounded px-1.5 py-0.5 text-[11px] text-foreground outline-none focus:ring-1 focus:ring-primary"
                    />
                  ) : (
                    <p
                      className="text-[11px] font-semibold text-foreground truncate"
                      onDoubleClick={(e) => { e.stopPropagation(); setRenamingId(c.id); setDraftTitle(c.title); }}
                      title="Double-click to rename"
                    >
                      {c.title}
                    </p>
                  )}
                  <p className="text-[9px] text-muted-foreground mt-0.5">{preview} · {formatWhen(c.updatedAt)}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive rounded transition-opacity"
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
