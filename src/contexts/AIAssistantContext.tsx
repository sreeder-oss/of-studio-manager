import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getStoredModelId, setStoredModelId } from '@/lib/aiModels';

export interface ChatAttachment {
  dataUrl: string; // base64 data URL (empty string for text-only attachments like PDFs)
  name: string;
  kind?: 'image' | 'pdf';
  text?: string; // extracted text for PDFs
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: ChatAttachment[];
  streaming?: boolean;
  appliedActions?: string[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

interface AIAssistantContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
  messages: ChatMessage[];
  appendMessage: (m: ChatMessage) => void;
  updateLastAssistant: (updater: (prev: string) => string, done?: boolean) => void;
  markActionApplied: (messageId: string, actionId: string) => void;
  reset: () => void;
  modelId: string;
  setModelId: (id: string) => void;
  // Conversation management
  conversations: Conversation[];
  activeConversationId: string;
  newConversation: () => void;
  switchConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
}

const AIAssistantContext = createContext<AIAssistantContextValue | null>(null);

const STORAGE_KEY = 'of-ai-conversations-v1';
const ACTIVE_KEY = 'of-ai-active-conversation-v1';
const MAX_CONVOS = 50;

export const useAIAssistant = () => {
  const ctx = useContext(AIAssistantContext);
  if (!ctx) throw new Error('useAIAssistant must be used inside AIAssistantProvider');
  return ctx;
};

export const useAIAssistantOptional = () => useContext(AIAssistantContext);

const newConvo = (): Conversation => ({
  id: crypto.randomUUID(),
  title: 'New chat',
  messages: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const loadConvos = (): { convos: Conversation[]; activeId: string } => {
  if (typeof window === 'undefined') {
    const c = newConvo();
    return { convos: [c], activeId: c.id };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Conversation[]) : [];
    if (Array.isArray(parsed) && parsed.length > 0) {
      const activeId = window.localStorage.getItem(ACTIVE_KEY) || parsed[0].id;
      const exists = parsed.some((c) => c.id === activeId);
      return { convos: parsed, activeId: exists ? activeId : parsed[0].id };
    }
  } catch { /* ignore */ }
  const c = newConvo();
  return { convos: [c], activeId: c.id };
};

const deriveTitle = (messages: ChatMessage[]): string => {
  const firstUser = messages.find((m) => m.role === 'user' && m.content.trim());
  if (!firstUser) return 'New chat';
  const t = firstUser.content.trim().replace(/\s+/g, ' ');
  return t.length > 48 ? t.slice(0, 48) + '…' : t;
};

export const AIAssistantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [modelId, setModelIdState] = useState<string>(() => getStoredModelId());

  const initial = useRef(loadConvos());
  const [conversations, setConversations] = useState<Conversation[]>(initial.current.convos);
  const [activeConversationId, setActiveConversationId] = useState<string>(initial.current.activeId);

  // Persist
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations.slice(0, MAX_CONVOS)));
    } catch { /* ignore */ }
  }, [conversations]);
  useEffect(() => {
    try { window.localStorage.setItem(ACTIVE_KEY, activeConversationId); } catch { /* ignore */ }
  }, [activeConversationId]);

  const messages = useMemo(
    () => conversations.find((c) => c.id === activeConversationId)?.messages ?? [],
    [conversations, activeConversationId]
  );

  const updateActive = useCallback((updater: (c: Conversation) => Conversation) => {
    setConversations((prev) => prev.map((c) => (c.id === activeConversationId ? updater(c) : c)));
  }, [activeConversationId]);

  const appendMessage = useCallback((m: ChatMessage) => {
    updateActive((c) => {
      const messages = [...c.messages, m];
      const title = c.title === 'New chat' ? deriveTitle(messages) : c.title;
      return { ...c, messages, title, updatedAt: Date.now() };
    });
  }, [updateActive]);

  const updateLastAssistant = useCallback((updater: (prev: string) => string, done?: boolean) => {
    updateActive((c) => {
      if (c.messages.length === 0) return c;
      const last = c.messages[c.messages.length - 1];
      if (last.role !== 'assistant') return c;
      const messages = c.messages.map((m, i) =>
        i === c.messages.length - 1
          ? { ...m, content: updater(m.content), streaming: done ? false : m.streaming }
          : m
      );
      return { ...c, messages, updatedAt: Date.now() };
    });
  }, [updateActive]);

  const markActionApplied = useCallback((messageId: string, actionId: string) => {
    updateActive((c) => ({
      ...c,
      messages: c.messages.map((m) =>
        m.id === messageId
          ? { ...m, appliedActions: Array.from(new Set([...(m.appliedActions ?? []), actionId])) }
          : m
      ),
    }));
  }, [updateActive]);

  const reset = useCallback(() => {
    updateActive((c) => ({ ...c, messages: [], title: 'New chat', updatedAt: Date.now() }));
  }, [updateActive]);

  const newConversation = useCallback(() => {
    const c = newConvo();
    setConversations((prev) => [c, ...prev].slice(0, MAX_CONVOS));
    setActiveConversationId(c.id);
  }, []);

  const switchConversation = useCallback((id: string) => {
    setActiveConversationId(id);
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (next.length === 0) {
        const c = newConvo();
        setActiveConversationId(c.id);
        return [c];
      }
      if (id === activeConversationId) {
        setActiveConversationId(next[0].id);
      }
      return next;
    });
  }, [activeConversationId]);

  const renameConversation = useCallback((id: string, title: string) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title: title.trim() || c.title } : c)));
  }, []);

  const setModelId = useCallback((id: string) => {
    setModelIdState(id);
    setStoredModelId(id);
  }, []);

  const value = useMemo(
    () => ({
      open, setOpen, messages, appendMessage, updateLastAssistant, markActionApplied, reset,
      modelId, setModelId,
      conversations, activeConversationId, newConversation, switchConversation, deleteConversation, renameConversation,
    }),
    [open, messages, appendMessage, updateLastAssistant, markActionApplied, reset, modelId, setModelId,
     conversations, activeConversationId, newConversation, switchConversation, deleteConversation, renameConversation]
  );

  return <AIAssistantContext.Provider value={value}>{children}</AIAssistantContext.Provider>;
};
