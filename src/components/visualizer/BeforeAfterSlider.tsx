import React, { useRef, useState } from 'react';
import { Columns2, Eye, Maximize2, Minimize2, SplitSquareHorizontal } from 'lucide-react';

export type CompareMode = 'split' | 'before' | 'after' | 'side';

interface Props {
  beforeUrl: string;
  afterUrl: string | null;
  caption?: string;
}

export const BeforeAfterSlider: React.FC<Props> = ({ beforeUrl, afterUrl, caption }) => {
  const [mode, setMode] = useState<CompareMode>(afterUrl ? 'split' : 'before');
  const [splitPct, setSplitPct] = useState(50);
  const [fullscreen, setFullscreen] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const updateFromClientX = (clientX: number) => {
    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = Math.min(100, Math.max(0, ((clientX - rect.left) / Math.max(1, rect.width)) * 100));
    setSplitPct(Math.round(pct));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!afterUrl || mode !== 'split') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!afterUrl || mode !== 'split' || e.buttons === 0) return;
    updateFromClientX(e.clientX);
  };

  const activeMode: CompareMode = afterUrl ? mode : 'before';

  const stage = (
    <div className={`space-y-2.5 ${fullscreen ? 'w-full max-w-5xl mx-auto' : ''}`}>
      {/* Mode Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="inline-flex items-center gap-1 bg-background/80 border border-border rounded-lg p-1">
          <button
            type="button"
            disabled={!afterUrl}
            onClick={() => setMode('split')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors disabled:opacity-40 ${
              activeMode === 'split' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <SplitSquareHorizontal size={12} /> Split
          </button>
          <button
            type="button"
            onClick={() => setMode('before')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors ${
              activeMode === 'before' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Eye size={12} /> Before
          </button>
          <button
            type="button"
            disabled={!afterUrl}
            onClick={() => setMode('after')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors disabled:opacity-40 ${
              activeMode === 'after' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Eye size={12} /> After
          </button>
          <button
            type="button"
            disabled={!afterUrl}
            onClick={() => setMode('side')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors disabled:opacity-40 ${
              activeMode === 'side' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Columns2 size={12} /> Side-by-Side
          </button>
        </div>

        <button
          type="button"
          onClick={() => setFullscreen((f) => !f)}
          className="px-2.5 py-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground text-[11px] font-semibold flex items-center gap-1"
          title={fullscreen ? 'Exit client presentation mode' : 'Client presentation mode'}
        >
          {fullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          <span className="hidden sm:inline">{fullscreen ? 'Exit Present' : 'Present'}</span>
        </button>
      </div>

      {/* Viewport */}
      {activeMode === 'side' && afterUrl ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="relative rounded-xl overflow-hidden border border-border bg-black/40">
            <img src={beforeUrl} alt="Before" className="w-full max-h-[520px] object-contain mx-auto" />
            <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-black/75 text-[10px] font-bold uppercase tracking-wider text-white">
              Before
            </span>
          </div>
          <div className="relative rounded-xl overflow-hidden border border-primary/40 bg-black/40">
            <img src={afterUrl} alt="After" className="w-full max-h-[520px] object-contain mx-auto" />
            <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-primary/90 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
              After
            </span>
          </div>
        </div>
      ) : (
        <div
          ref={stageRef}
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onKeyDown={(e) => {
            if (activeMode !== 'split') return;
            if (e.key === 'ArrowLeft') setSplitPct((p) => Math.max(0, p - 5));
            if (e.key === 'ArrowRight') setSplitPct((p) => Math.min(100, p + 5));
          }}
          className={`relative rounded-xl overflow-hidden border border-border bg-black/50 select-none ${
            activeMode === 'split' ? 'cursor-ew-resize touch-none' : ''
          }`}
        >
          <img
            src={activeMode === 'after' && afterUrl ? afterUrl : beforeUrl}
            alt={activeMode === 'after' ? 'After preview' : 'Before photo'}
            className="w-full max-h-[540px] object-contain mx-auto block"
          />

          {activeMode === 'split' && afterUrl && (
            <>
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 0 0 ${splitPct}%)` }}
              >
                <img
                  src={afterUrl}
                  alt="After preview"
                  className="w-full h-full max-h-[540px] object-contain mx-auto block"
                />
              </div>

              {/* Divider Line & Handle */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-primary shadow-[0_0_12px_rgba(0,0,0,0.6)] pointer-events-none"
                style={{ left: `${splitPct}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg border-2 border-background text-[10px] font-bold">
                  ⇄
                </div>
              </div>

              <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-black/75 text-[10px] font-bold uppercase tracking-wider text-white pointer-events-none">
                Before
              </span>
              <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-primary/90 text-[10px] font-bold uppercase tracking-wider text-primary-foreground pointer-events-none">
                After
              </span>
            </>
          )}
        </div>
      )}

      {caption && (
        <p className="text-[11px] text-muted-foreground text-center">{caption}</p>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md p-4 sm:p-8 flex flex-col justify-center overflow-y-auto">
        {stage}
      </div>
    );
  }

  return stage;
};
