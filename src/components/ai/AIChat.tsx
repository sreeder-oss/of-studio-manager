import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Mic, Paperclip, Send, Square, X, Sparkles, Zap } from 'lucide-react';
import { useAIAssistant } from '@/contexts/AIAssistantContext';
import { useAIChat } from '@/hooks/useAIChat';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { ChatMessage } from './ChatMessage';
import { EstimatePreview } from './EstimatePreview';
import { parseEstimateFromText, type EstimateDoc } from '@/lib/estimateSchema';
import type { ChatAttachment } from '@/contexts/AIAssistantContext';

const HANDS_FREE_KEY = 'of-ai-handsfree';

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

export const AIChat: React.FC = () => {
  const { messages } = useAIAssistant();
  const { send, cancel, isLoading } = useAIChat();
  const location = useLocation();
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [previewEstimate, setPreviewEstimate] = useState<EstimateDoc | null>(null);
  const [handsFree, setHandsFree] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(HANDS_FREE_KEY) === '1';
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Refs so the speech callback always has fresh state without re-creating it
  const handsFreeRef = useRef(handsFree);
  handsFreeRef.current = handsFree;
  const inputRef = useRef(input);
  inputRef.current = input;
  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;
  const isLoadingRef = useRef(isLoading);
  isLoadingRef.current = isLoading;

  const handleSend = (overrideText?: string) => {
    if (isLoadingRef.current) return;
    const text = overrideText ?? input;
    const atts = attachmentsRef.current;
    if (!text.trim() && atts.length === 0) return;
    send({
      text,
      attachments: atts.length > 0 ? atts : undefined,
      currentPage: location.pathname,
    });
    setInput('');
    setAttachments([]);
  };

  const { supported: micSupported, listening, interim, start: startMic, stop: stopMic } =
    useSpeechRecognition((transcript) => {
      const merged = inputRef.current ? `${inputRef.current} ${transcript}` : transcript;
      if (handsFreeRef.current) {
        setInput('');
        handleSend(merged);
      } else {
        setInput(merged);
      }
    });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const toggleHandsFree = () => {
    const next = !handsFree;
    setHandsFree(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(HANDS_FREE_KEY, next ? '1' : '0');
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const next: ChatAttachment[] = [];
    for (const f of Array.from(files).slice(0, 4)) {
      if (!f.type.startsWith('image/')) continue;
      const dataUrl = await fileToDataUrl(f);
      next.push({ dataUrl, name: f.name });
    }
    setAttachments((prev) => [...prev, ...next].slice(0, 4));
  };

  const openEstimate = (text: string) => {
    const e = parseEstimateFromText(text);
    if (e) setPreviewEstimate(e);
  };

  return (
    <div className="flex h-full">
      {/* Chat column */}
      <div className={`flex flex-col h-full ${previewEstimate ? 'hidden md:flex md:w-1/2 md:border-r md:border-border' : 'w-full'}`}>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-8">
              <div className="h-12 w-12 rounded-full bg-primary/15 text-primary flex items-center justify-center mb-3">
                <Sparkles size={20} />
              </div>
              <p className="text-[12px] font-bold text-foreground mb-1">OF Assistant</p>
              <p className="text-[11px] max-w-xs">Ask me to write an estimate, log a receipt, look up a contact, or summarize a project. You can also attach photos or plan drawings.</p>
              <div className="mt-4 grid grid-cols-1 gap-1.5 text-[10px] w-full max-w-xs">
                <SuggestionChip text="Write an estimate for 2,900 SF Biolime exterior" onClick={setInput} />
                <SuggestionChip text="What projects are open right now?" onClick={setInput} />
                <SuggestionChip text="Add a $340 Sullivan Supply receipt for materials" onClick={setInput} />
              </div>
            </div>
          )}
          {messages.map((m) => <ChatMessage key={m.id} message={m} onOpenEstimate={openEstimate} />)}
        </div>

        {/* Input */}
        <div className="border-t border-border p-2 space-y-2">
          {listening && interim && (
            <div className="text-[10px] italic text-primary px-2 truncate">{interim}…</div>
          )}
          {attachments.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {attachments.map((a, i) => (
                <div key={i} className="relative">
                  <img src={a.dataUrl} alt={a.name} className="h-12 w-12 object-cover rounded-lg border border-border" />
                  <button onClick={() => setAttachments((p) => p.filter((_, j) => j !== i))}
                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5">
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-1.5">
            <button onClick={() => fileInputRef.current?.click()} className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent">
              <Paperclip size={16} />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }} />
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={listening ? 'Listening…' : 'Ask anything…'}
              rows={1}
              className="flex-1 bg-card border border-border rounded-xl py-2 px-3 text-[12px] text-foreground outline-none focus:ring-1 focus:ring-primary resize-none max-h-32"
            />
            {micSupported && (
              <>
                <button
                  onClick={toggleHandsFree}
                  title={handsFree ? 'Hands-free on (auto-send after silence)' : 'Hands-free off'}
                  className={`p-2 rounded-lg transition-colors ${handsFree ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
                >
                  <Zap size={14} />
                </button>
                <button
                  onClick={() => (listening ? stopMic() : startMic())}
                  className={`p-2 rounded-lg transition-colors ${listening ? 'bg-destructive text-destructive-foreground animate-pulse' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
                >
                  <Mic size={16} />
                </button>
              </>
            )}
            {isLoading ? (
              <button onClick={cancel} className="p-2 bg-destructive text-destructive-foreground rounded-lg">
                <Square size={16} />
              </button>
            ) : (
              <button onClick={() => handleSend()} disabled={!input.trim() && attachments.length === 0}
                className="p-2 bg-primary text-primary-foreground rounded-lg shadow-glow disabled:opacity-40">
                <Send size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Estimate preview pane */}
      {previewEstimate && (
        <div className="flex-1 md:w-1/2">
          <EstimatePreview initial={previewEstimate} onClose={() => setPreviewEstimate(null)} />
        </div>
      )}
    </div>
  );
};

const SuggestionChip: React.FC<{ text: string; onClick: (s: string) => void }> = ({ text, onClick }) => (
  <button onClick={() => onClick(text)} className="bg-card border border-border rounded-lg px-3 py-1.5 text-left hover:border-primary/50 transition-colors text-foreground/80">
    {text}
  </button>
);
