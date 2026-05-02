import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export interface ChatAttachment {
  dataUrl: string; // base64 data URL
  name: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: ChatAttachment[];
  streaming?: boolean;
}

interface AIAssistantContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
  messages: ChatMessage[];
  appendMessage: (m: ChatMessage) => void;
  updateLastAssistant: (updater: (prev: string) => string, done?: boolean) => void;
  reset: () => void;
}

const AIAssistantContext = createContext<AIAssistantContextValue | null>(null);

export const useAIAssistant = () => {
  const ctx = useContext(AIAssistantContext);
  if (!ctx) throw new Error('useAIAssistant must be used inside AIAssistantProvider');
  return ctx;
};

export const AIAssistantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const appendMessage = useCallback((m: ChatMessage) => {
    setMessages((prev) => [...prev, m]);
  }, []);

  const updateLastAssistant = useCallback((updater: (prev: string) => string, done?: boolean) => {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.role !== 'assistant') return prev;
      return prev.map((m, i) =>
        i === prev.length - 1
          ? { ...m, content: updater(m.content), streaming: done ? false : m.streaming }
          : m
      );
    });
  }, []);

  const reset = useCallback(() => setMessages([]), []);

  const value = useMemo(
    () => ({ open, setOpen, messages, appendMessage, updateLastAssistant, reset }),
    [open, messages, appendMessage, updateLastAssistant, reset]
  );

  return <AIAssistantContext.Provider value={value}>{children}</AIAssistantContext.Provider>;
};
