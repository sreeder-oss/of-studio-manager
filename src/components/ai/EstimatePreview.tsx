import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Save, Trash2, Plus, FileDown } from 'lucide-react';
import { recalcEstimate, type EstimateDoc } from '@/lib/estimateSchema';
import { downloadEstimatePdf } from '@/lib/estimatePdf';
import { useContacts, useSaveContact } from '@/hooks/useContacts';
import { useProjects } from '@/hooks/useProjects';
import { useSaveEstimate } from '@/hooks/useEstimates';
import { toast } from 'sonner';
import { useSettings } from '@/hooks/useSettings';

interface Props {
  initial: EstimateDoc;
  onClose: () => void;
}

const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const NEW_CLIENT = '__new__';
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();

export const EstimatePreview: React.FC<Props> = ({ initial, onClose }) => {
  const [doc, setDoc] = useState<EstimateDoc>(() => recalcEstimate(initial));
  const { data: contacts = [] } = useContacts();
  const { data: projects = [] } = useProjects();
  const saveEstimate = useSaveEstimate();
  const saveContact = useSaveContact();
  const { settings } = useSettings();

  // Tiered fuzzy match: exact CI → normalized → token-subset (only auto-select on unique match)
  const matchedContactId = useMemo(() => {
    if (!doc.client_name) return '';
    const target = doc.client_name;
    const exact = contacts.filter((c) => c.name.toLowerCase() === target.toLowerCase());
    if (exact.length === 1) return exact[0].id;
    const nt = norm(target);
    const normalized = contacts.filter((c) => norm(c.name) === nt);
    if (normalized.length === 1) return normalized[0].id;
    const tokens = nt.split(' ').filter(Boolean);
    if (tokens.length) {
      const tokenMatch = contacts.filter((c) => {
        const cn = norm(c.name);
        return tokens.every((t) => cn.includes(t));
      });
      if (tokenMatch.length === 1) return tokenMatch[0].id;
    }
    return '';
  }, [contacts, doc.client_name]);

  const [contactId, setContactId] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '' });
  const [createError, setCreateError] = useState<string | null>(null);

  React.useEffect(() => {
    if (matchedContactId && !contactId) setContactId(matchedContactId);
  }, [matchedContactId, contactId]);

  const onClientChange = (val: string) => {
    if (val === NEW_CLIENT) {
      setNewClient({ name: doc.client_name || '', email: '', phone: '' });
      setShowNewClient(true);
      setCreateError(null);
    } else {
      setContactId(val);
      setShowNewClient(false);
    }
  };

  const handleCreateClient = async () => {
    if (!newClient.name.trim()) {
      setCreateError('Name is required');
      return;
    }
    try {
      const created = await saveContact.mutateAsync({
        name: newClient.name.trim(),
        email: newClient.email.trim() || null,
        phone: newClient.phone.trim() || null,
        type: 'Client',
        status: 'Active',
      });
      setContactId(created.id);
      setShowNewClient(false);
      setCreateError(null);
      toast.success('Client created');
    } catch (e: any) {
      console.error('Create contact failed:', e);
      setCreateError(e?.message || 'Failed to create client');
    }
  };

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

  const navigate = useNavigate();
  const handleSave = async () => {
    if (!contactId) {
      toast.error('Select a client to save the estimate');
      return;
    }
    try {
      const preTax = doc.direct_cost_subtotal + doc.overhead_amount + doc.profit_amount;
      const taxFraction = (doc.tax_rate ?? 0) / 100;
      const saved = await saveEstimate.mutateAsync({
        contact_id: contactId,
        project_id: projectId || null,
        line_items: doc as any, // store the full structured doc in jsonb
        subtotal: preTax,
        direct_cost_subtotal: doc.direct_cost_subtotal,
        overhead_amount: doc.overhead_amount,
        profit_amount: doc.profit_amount,
        pre_tax_total: preTax,
        tax_rate: taxFraction,
        tax_amount: preTax * taxFraction,
        total: doc.total,
        status: 'Pending',
        valid_until: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      });
      toast.success('Estimate saved');
      onClose();
      if (saved?.id) navigate(`/estimates/${saved.id}`);
    } catch (e: any) {
      console.error('Save estimate failed:', e);
      toast.error(e?.message || 'Failed to save estimate');
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
            {!showNewClient ? (
              <>
                <select value={contactId} onChange={(e) => onClientChange(e.target.value)}
                  className="w-full bg-card border border-border rounded-lg py-1.5 px-2 text-[11px] text-foreground outline-none focus:ring-1 focus:ring-primary">
                  <option value="">Select client...</option>
                  {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  <option value={NEW_CLIENT}>+ Create new client...</option>
                </select>
                {!contactId && (
                  <p className="text-[9px] text-muted-foreground mt-1 italic">Select a client to enable saving</p>
                )}
              </>
            ) : (
              <div className="space-y-1.5 bg-card border border-primary/30 rounded-lg p-2">
                <input autoFocus placeholder="Name *" value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  className="w-full bg-accent border border-border rounded px-2 py-1 text-[11px] text-foreground outline-none" />
                <input placeholder="Email (optional)" value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  className="w-full bg-accent border border-border rounded px-2 py-1 text-[11px] text-foreground outline-none" />
                <input placeholder="Phone (optional)" value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  className="w-full bg-accent border border-border rounded px-2 py-1 text-[11px] text-foreground outline-none" />
                {createError && <p className="text-[9px] text-destructive">{createError}</p>}
                <div className="flex gap-1.5 pt-1">
                  <button onClick={() => { setShowNewClient(false); setCreateError(null); }}
                    className="flex-1 bg-accent text-foreground py-1 rounded text-[10px] font-bold uppercase tracking-widest">Cancel</button>
                  <button onClick={handleCreateClient} disabled={saveContact.isPending}
                    className="flex-1 bg-primary text-primary-foreground py-1 rounded text-[10px] font-bold uppercase tracking-widest disabled:opacity-50">
                    {saveContact.isPending ? 'Saving...' : 'Create'}
                  </button>
                </div>
              </div>
            )}
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
              downloadEstimatePdf(doc, { depositPct: settings.default_deposit_pct, company: { name: settings.company_name.toUpperCase() } });
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
          title={!contactId ? 'Select a client to enable saving' : undefined}
          className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-glow disabled:opacity-50 flex items-center justify-center gap-2">
          <Save size={14} /> {saveEstimate.isPending ? 'Saving...' : 'Save Estimate'}
        </button>
      </div>
    </div>
  );
};
