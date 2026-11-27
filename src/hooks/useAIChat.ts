import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAIAssistant, type ChatAttachment, type ChatMessage } from '@/contexts/AIAssistantContext';
import { useAIPageContextValue } from '@/contexts/AIContextProvider';
import { getStoredDeepSeekKey, getStoredBackupKey } from '@/lib/aiModels';
import { buildColorMatcherPromptContext } from '@/lib/paintMatcher';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

const COLOR_QUERY_RE =
  /\b(colou?r|swatch|shade|undertone|lrv|palette|visualizer|match|closest|shoji|swiss\s*coffee|alabaster|white\s*dove|chantilly|agreeable|accessible\s*beige|pale\s*oak|revere|edgecomb|shiitake|urbane|iron\s*ore|tricorn|sherwin|benjamin\s*moore|spectrum|behr|farrow|meoded|romabio|vasari|surecrete|mc-\d+|rb-|sc-)\b/i;

interface SendOptions {
  text: string;
  attachments?: ChatAttachment[];
  currentPage?: string;
  currentRecord?: unknown;
}

export const useAIChat = () => {
  const { messages, appendMessage, updateLastAssistant, modelId } = useAIAssistant();
  const { currentRecord } = useAIPageContextValue();
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async ({ text, attachments, currentPage, currentRecord: overrideRecord }: SendOptions) => {
      if (!text.trim() && (!attachments || attachments.length === 0)) return;
      const baseRecord = overrideRecord ?? currentRecord ?? undefined;
      const wantsColorCatalog =
        COLOR_QUERY_RE.test(text) ||
        currentPage === '/visualizer' ||
        messages.slice(-4).some((m) => COLOR_QUERY_RE.test(m.content));
      const recordForRequest = wantsColorCatalog
        ? {
            ...(baseRecord && typeof baseRecord === 'object' ? (baseRecord as Record<string, unknown>) : { activeRecord: baseRecord ?? null }),
            studioColorCatalogAndPaintMatcher: buildColorMatcherPromptContext(),
          }
        : baseRecord;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        attachments,
      };
      appendMessage(userMsg);

      // Build outgoing message list for the API
      const apiMessages = [...messages, userMsg].map((m) => {
        if (m.role === 'user' && m.attachments && m.attachments.length > 0) {
          const images = m.attachments.filter((a) => a.kind !== 'pdf' && a.dataUrl);
          const pdfs = m.attachments.filter((a) => a.kind === 'pdf');
          const pdfText = pdfs
            .map((p) => `\n\n[Attached PDF: ${p.name}]\n${p.text ?? ''}`)
            .join('');
          const baseText = (m.content || (images.length ? '(image attached)' : '(pdf attached)')) + pdfText;
          if (images.length === 0) {
            return { role: 'user' as const, content: baseText };
          }
          return {
            role: 'user' as const,
            content: [
              { type: 'text' as const, text: baseText },
              ...images.map((a) => ({ type: 'image_url' as const, image_url: { url: a.dataUrl } })),
            ],
          };
        }
        return { role: m.role, content: m.content };
      });

      // Placeholder assistant message we'll stream into
      appendMessage({ id: crypto.randomUUID(), role: 'assistant', content: '', streaming: true });
      setIsLoading(true);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const controller = new AbortController();
        abortRef.current = controller;

        const resp = await fetch(CHAT_URL, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: apiMessages,
            currentPage,
            currentRecord: recordForRequest,
            hasImages: !!attachments && attachments.length > 0,
            model: modelId,
            apiKey: getStoredDeepSeekKey() || undefined,
            backupApiKey: getStoredBackupKey() || undefined,
          }),
        });

        if (!resp.ok) {
          let errMsg = 'AI request failed';
          try { errMsg = (await resp.json()).error ?? errMsg; } catch { /* ignore */ }
          if (resp.status === 429) toast.error('Too many requests — wait a moment and try again.');
          else if (resp.status === 402) toast.error('AI credits exhausted. Add credits in workspace settings.');
          else toast.error(errMsg);
          updateLastAssistant(() => `_${errMsg}_`, true);
          return;
        }

        if (!resp.body) {
          updateLastAssistant(() => '_No response body_', true);
          return;
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = '';
        let streamDone = false;

        while (!streamDone) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });

          let nl: number;
          while ((nl = textBuffer.indexOf('\n')) !== -1) {
            let line = textBuffer.slice(0, nl);
            textBuffer = textBuffer.slice(nl + 1);
            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (line.startsWith(':') || line.trim() === '') continue;
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') { streamDone = true; break; }
            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (delta) updateLastAssistant((prev) => prev + delta);
            } catch {
              textBuffer = line + '\n' + textBuffer;
              break;
            }
          }
        }

        // flush leftovers
        if (textBuffer.trim()) {
          for (let raw of textBuffer.split('\n')) {
            if (!raw) continue;
            if (raw.endsWith('\r')) raw = raw.slice(0, -1);
            if (!raw.startsWith('data: ')) continue;
            const jsonStr = raw.slice(6).trim();
            if (jsonStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (delta) updateLastAssistant((prev) => prev + delta);
            } catch { /* ignore */ }
          }
        }

        updateLastAssistant((p) => p, true);
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        console.error('AI chat error', e);
        toast.error('Connection error');
        updateLastAssistant(() => '_Connection error_', true);
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [messages, appendMessage, updateLastAssistant, currentRecord, modelId]
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  return { send, cancel, isLoading };
};
