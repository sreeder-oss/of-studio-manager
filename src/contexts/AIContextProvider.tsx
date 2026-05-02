import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type AIPageRecord =
  | { kind: 'project'; id: string; name: string; status?: string | null; address?: string | null; contact_name?: string | null; contract_value?: number | null }
  | { kind: 'estimate'; id: string; total?: number | null; project_name?: string | null; contact_name?: string | null; status?: string | null }
  | { kind: 'invoice'; id: string; total?: number | null; paid?: boolean | null; due_date?: string | null; project_name?: string | null }
  | { kind: 'contact'; id: string; name: string; email?: string | null; phone?: string | null; type?: string | null }
  | Record<string, unknown>;

interface Ctx {
  currentRecord: AIPageRecord | null;
  setCurrentRecord: (r: AIPageRecord | null) => void;
}

const AIPageContext = createContext<Ctx | null>(null);

export const useAIPageContextValue = () => {
  const ctx = useContext(AIPageContext);
  if (!ctx) throw new Error('useAIPageContextValue must be used inside AIContextProvider');
  return ctx;
};

export const AIContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRecord, setCurrentRecord] = useState<AIPageRecord | null>(null);
  const value = useMemo(() => ({ currentRecord, setCurrentRecord }), [currentRecord]);
  return <AIPageContext.Provider value={value}>{children}</AIPageContext.Provider>;
};
