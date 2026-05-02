import { useEffect } from 'react';
import { useAIPageContextValue, type AIPageRecord } from '@/contexts/AIContextProvider';

/**
 * Register a compact summary of the currently-viewed record with the AI assistant.
 * Pass null/undefined while loading; the record is cleared on unmount.
 */
export const useAIPageContext = (record: AIPageRecord | null | undefined) => {
  const { setCurrentRecord } = useAIPageContextValue();
  useEffect(() => {
    if (record) setCurrentRecord(record);
    return () => setCurrentRecord(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(record ?? null)]);
};
