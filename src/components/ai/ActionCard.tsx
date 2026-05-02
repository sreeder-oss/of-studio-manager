import React, { useState } from 'react';
import { Check, Plus, X, ExternalLink } from 'lucide-react';
import type { ParsedAction } from '@/lib/actionSchema';
import { useAIActions } from '@/hooks/useAIActions';

interface Props {
  parsed: ParsedAction;
  applied: boolean;
  onApplied: (id: string) => void;
}

export const ActionCard: React.FC<Props> = ({ parsed, applied, onApplied }) => {
  const { run } = useAIActions();
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const a = parsed.action;
  if (a.type !== 'add_system') return null;
  const d = a.data;

  const fields: Array<[string, string]> = [
    ['Manufacturer', d.manufacturer ?? '—'],
    ['Coats', d.coats != null ? String(d.coats) : '—'],
    ['Coverage', d.coverage_rate != null ? `${d.coverage_rate} SF/${d.coverage_unit ?? 'unit'}` : '—'],
    ['Cost', d.cost_per_unit != null ? `$${d.cost_per_unit}/${d.coverage_unit ?? 'unit'}` : '—'],
    ['Labor', d.labor_rate_per_sf != null ? `$${d.labor_rate_per_sf}/SF` : '—'],
  ];

  const apply = async () => {
    setBusy(true);
    const ok = await run(a);
    setBusy(false);
    if (ok) onApplied(parsed.id);
  };

  return (
    <div className="mt-2 bg-card border border-primary/30 rounded-lg p-2.5 text-[11px]">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0">
          <div className="text-[9px] font-bold uppercase tracking-widest text-primary">Add system</div>
          <div className="font-bold text-foreground truncate">{d.name}</div>
        </div>
        {d.source_url && (
          <a href={d.source_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary shrink-0">
            <ExternalLink size={12} />
          </a>
        )}
      </div>
      {d.description && <p className="text-foreground/70 mb-1.5 line-clamp-2">{d.description}</p>}
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mb-2">
        {fields.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2">
            <span className="text-muted-foreground">{k}</span>
            <span className="text-foreground/90 truncate">{v}</span>
          </div>
        ))}
      </div>
      {applied ? (
        <div className="flex items-center gap-1.5 text-primary text-[10px] font-bold uppercase tracking-widest">
          <Check size={12} /> Added to library
        </div>
      ) : (
        <div className="flex gap-1.5">
          <button
            onClick={apply}
            disabled={busy}
            className="flex-1 bg-primary text-primary-foreground rounded-md py-1.5 px-2 flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
          >
            <Plus size={12} /> {busy ? 'Adding…' : 'Add'}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="bg-card border border-border text-muted-foreground rounded-md py-1.5 px-2 hover:text-foreground"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
};
