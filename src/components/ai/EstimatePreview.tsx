import React, { useMemo, useState } from 'react';
import { X, Save, Trash2, Plus, FileDown } from 'lucide-react';
import { recalcEstimate, type EstimateDoc } from '@/lib/estimateSchema';
import { downloadEstimatePdf } from '@/lib/estimatePdf';
import { useContacts } from '@/hooks/useContacts';
import { useProjects } from '@/hooks/useProjects';
import { useSaveEstimate } from '@/hooks/useEstimates';
import { toast } from 'sonner';

interface Props {
  initial: EstimateDoc;
  onClose: () => void;
}

const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const EstimatePreview: React.FC<Props> = ({ initial, onClose }) => {
  const [doc, setDoc] = useState<EstimateDoc>(() => recalcEstimate(initial));
  const { data: contacts = [] } = useContacts();
  const { data: projects = [] } = useProjects();
  const saveEstimate = useSaveEstimate();

  // try to auto-match a contact / project by name
  const matchedContactId = useMemo(() => {
    if (!doc.client_name) return '';
    const c = contacts.find((x) => x.name.toLowerCase() === doc.client_name.toLowerCase());
    return c?.id ?? '';
  }, [contacts, doc.client_name]);
  const [contactId, setContactId] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');

  React.useEffect(() => { if (matchedContactId && !contactId) setContactId(matchedContactId); }, [matchedContactId, contactId]);

  const update = (next: EstimateDoc) => setDoc(recalcEstimate(next));

  const updateLine = (sIdx: number, lIdx: number, field: 'description' | 'qty' | 'unit' | 'unit_cost', value: string | number) => {
    const sections = doc.sections.map((s, i) => {
      if (i !== sIdx) return s;
      const items = s.line_items.map((li, j) =>
        j === lIdx ? { ...li, [field]: field === 'description' || field === 'unit' ? String(value) : Number(value) || 0 } : li
      );
      return { ...s, line_items: items };
    });
    update({ ...doc, sections });
  };

  const addLine = (sIdx: number) => {
    const sections = doc.sections.map((s, i) =>
      i === sIdx ? { ...s, line_items: [...s.line_items, { description: '', sub_note: '', qty: 1, unit: 'EA', unit_cost: 0, total: 0 }] } : s
    );
    update({ ...doc, sections });
  };

  const removeLine = (sIdx: number, lIdx: number) => {
    const sections = doc.sections.map((s, i) =>
      i === sIdx ? { ...s, line_items: s.line_items.filter((_, j) => j !== lIdx) } : s
    );
    update({ ...doc, sections });
  };

  const handleSave = async () => {
    if (!contactId) {
      toast.error('Select a client to save the estimate');
      return;
    }
    try {
      await saveEstimate.mutateAsync({
        contact_id: contactId,
        project_id: projectId || undefined,
        line_items: doc as any, // store the full structured doc in jsonb
        subtotal: doc.direct_cost_subtotal + doc.overhead_amount + doc.profit_amount,
        tax_rate: doc.tax_rate / 100,
        total: doc.total,
        status: 'Pending',
        valid_until: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      });
      toast.success('Estimate saved');
      onClose();
    } catch (e) {
      toast.error('Failed to save estimate');
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div>
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">AI Estimate Preview</p>
          <h3 className="font-serif text-sm text-foreground leading-tight">{doc.title}</h3>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-accent rounded-full text-muted-foreground"><X size={16} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar">
        {/* Client / Project selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Client *</label>
            <select value={contactId} onChange={(e) => setContactId(e.target.value)}
              className="w-full bg-card border border-border rounded-lg py-1.5 px-2 text-[11px] text-foreground outline-none focus:ring-1 focus:ring-primary">
              <option value="">Select client...</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Project</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
              className="w-full bg-card border border-border rounded-lg py-1.5 px-2 text-[11px] text-foreground outline-none focus:ring-1 focus:ring-primary">
              <option value="">No project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        {/* Meta */}
        <div className="bg-card border border-border rounded-xl p-3 text-[11px] space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">Substrate</span><span className="text-foreground">{doc.substrate}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">System</span><span className="text-foreground">{doc.system_name}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Area</span><span className="text-foreground">{doc.area_sf.toLocaleString()} SF <span className="text-[9px] text-muted-foreground italic">{doc.area_note}</span></span></div>
          {doc.duration_estimate && <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span className="text-foreground">{doc.duration_estimate}</span></div>}
        </div>

        {/* Sections */}
        {doc.sections.map((s, sIdx) => (
          <div key={sIdx} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-3 py-2 bg-secondary/40 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">{s.label}</span>
              <span className="text-[11px] text-primary font-mono">{fmt(s.subtotal)}</span>
            </div>
            <div className="p-2 space-y-2">
              {s.line_items.map((li, lIdx) => (
                <div key={lIdx} className="space-y-1 border-b border-border/50 last:border-0 pb-2 last:pb-0">
                  <input value={li.description} onChange={(e) => updateLine(sIdx, lIdx, 'description', e.target.value)}
                    className="w-full bg-accent border border-border rounded px-2 py-1 text-[11px] text-foreground outline-none" />
                  {li.sub_note && <p className="text-[9px] italic text-muted-foreground px-1">{li.sub_note}</p>}
                  <div className="flex gap-1.5 items-center text-[10px]">
                    <input type="number" value={li.qty} onChange={(e) => updateLine(sIdx, lIdx, 'qty', e.target.value)}
                      className="w-14 bg-accent border border-border rounded px-1.5 py-1 text-right outline-none" />
                    <input value={li.unit} onChange={(e) => updateLine(sIdx, lIdx, 'unit', e.target.value)}
                      className="w-12 bg-accent border border-border rounded px-1.5 py-1 outline-none" />
                    <span className="text-muted-foreground">@</span>
                    <input type="number" value={li.unit_cost} onChange={(e) => updateLine(sIdx, lIdx, 'unit_cost', e.target.value)}
                      className="w-16 bg-accent border border-border rounded px-1.5 py-1 text-right outline-none" />
                    <span className="flex-1 text-right font-mono text-primary">{fmt(li.total)}</span>
                    <button onClick={() => removeLine(sIdx, lIdx)} className="text-destructive p-1"><Trash2 size={11} /></button>
                  </div>
                </div>
              ))}
              <button onClick={() => addLine(sIdx)} className="w-full text-[9px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground py-1 flex items-center justify-center gap-1">
                <Plus size={10} /> Add line
              </button>
            </div>
          </div>
        ))}

        {/* Totals */}
        <div className="bg-card border border-border rounded-xl p-3 text-[11px] space-y-1.5">
          <div className="flex justify-between"><span className="text-muted-foreground">Direct cost</span><span className="font-mono">{fmt(doc.direct_cost_subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Overhead ({doc.overhead_pct}%)</span><span className="font-mono">{fmt(doc.overhead_amount)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Profit ({doc.profit_pct}%)</span><span className="font-mono">{fmt(doc.profit_amount)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tax ({doc.tax_rate}%)</span><span className="font-mono">{fmt(doc.tax_amount)}</span></div>
          <div className="flex justify-between pt-2 border-t border-border text-sm font-serif text-primary">
            <span>Total</span><span>{fmt(doc.total)}</span>
          </div>
          {doc.per_sf > 0 && <div className="text-right text-[10px] text-muted-foreground">{fmt(doc.per_sf)}/SF</div>}
        </div>

        {/* Bid range */}
        {doc.bid_range && (
          <div className="bg-card border border-border rounded-xl p-3 text-[11px]">
            <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground mb-2">Suggested bid range</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              {(['low', 'mid', 'high'] as const).map((k) => (
                <div key={k} className={`p-2 rounded-lg ${k === 'mid' ? 'bg-primary/10 border border-primary/30' : 'bg-accent'}`}>
                  <p className="text-[8px] uppercase tracking-wider text-muted-foreground">{k}</p>
                  <p className="font-mono text-foreground">{fmt(doc.bid_range![k])}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {doc.assumptions.length > 0 && (
          <div className="text-[10px]">
            <p className="font-bold uppercase tracking-widest text-muted-foreground mb-1">Assumptions</p>
            <ul className="list-disc list-inside text-foreground/80 space-y-0.5">{doc.assumptions.map((a, i) => <li key={i}>{a}</li>)}</ul>
          </div>
        )}
        {doc.exclusions.length > 0 && (
          <div className="text-[10px]">
            <p className="font-bold uppercase tracking-widest text-muted-foreground mb-1">Exclusions</p>
            <ul className="list-disc list-inside text-foreground/80 space-y-0.5">{doc.exclusions.map((a, i) => <li key={i}>{a}</li>)}</ul>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border flex gap-2">
        <button
          onClick={() => {
            try {
              downloadEstimatePdf(doc);
              toast.success('PDF downloaded');
            } catch (e) {
              console.error(e);
              toast.error('Failed to generate PDF');
            }
          }}
          className="flex-1 bg-card border border-primary/40 text-primary py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-primary/10"
        >
          <FileDown size={14} /> PDF
        </button>
        <button onClick={handleSave} disabled={saveEstimate.isPending || !contactId}
          className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-glow disabled:opacity-50 flex items-center justify-center gap-2">
          <Save size={14} /> {saveEstimate.isPending ? 'Saving...' : 'Save Estimate'}
        </button>
      </div>
    </div>
  );
};
