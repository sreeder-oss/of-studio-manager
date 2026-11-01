import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useContacts } from '@/hooks/useContacts';
import { useProjects } from '@/hooks/useProjects';
import { useSystems } from '@/hooks/useSystems';
import { useSaveEstimate } from '@/hooks/useEstimates';
import { useSettings, pctLabel, depositAmount } from '@/hooks/useSettings';
import { computeScopePricing } from '@/lib/pricing';
import { PREP_TIERS, type EstimateScope, type ScopeArea } from '@/lib/scopeSchema';
import type { EstimateDoc } from '@/lib/estimateSchema';
import { CostBreakdown } from '@/components/CostBreakdown';
import { QuickContactDialog } from '@/components/QuickCreateDialogs';

const money = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const inputCls = 'bg-accent border border-border rounded-lg p-1.5 text-foreground text-[11px] outline-none focus:ring-1 focus:ring-primary';

export const ScopePreview: React.FC<{ initial: EstimateScope; onClose: () => void }> = ({ initial, onClose }) => {
  const navigate = useNavigate();
  const { data: contacts = [] } = useContacts();
  const { data: projects = [] } = useProjects();
  const { data: systems = [] } = useSystems();
  const { settings } = useSettings();
  const saveEstimate = useSaveEstimate();

  const [areas, setAreas] = useState<ScopeArea[]>(initial.areas);
  const [title, setTitle] = useState(initial.title || 'Estimate');
  const matched = useMemo(() => {
    const n = initial.client_name.trim().toLowerCase();
    if (!n) return '';
    const hits = contacts.filter(c => c.name.toLowerCase().includes(n) || n.includes(c.name.toLowerCase()));
    return hits.length === 1 ? hits[0].id : '';
  }, [contacts, initial.client_name]);
  const [contactId, setContactId] = useState('');
  const effectiveContactId = contactId || matched;
  const [projectId, setProjectId] = useState('');
  const [contactOpen, setContactOpen] = useState(false);

  const sysById = (id: string | null) => systems.find(s => s.id === id) || null;
  const taxRate = Number(settings.default_tax_rate);
  const pricing = useMemo(() => computeScopePricing(
    areas.map(a => ({ name: a.name, area_sf: a.area_sf, system: sysById(a.system_id) as any })), settings, taxRate,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [areas, systems, settings, taxRate]);

  const update = (i: number, patch: Partial<ScopeArea>) => setAreas(prev => prev.map((a, j) => j === i ? { ...a, ...patch } : a));
  const unmatched = areas.some(a => !sysById(a.system_id));

  const buildDoc = (): EstimateDoc => {
    const sysNames = Array.from(new Set(areas.map(a => sysById(a.system_id)?.name).filter(Boolean))) as string[];
    return {
      title,
      client_name: contacts.find(c => c.id === effectiveContactId)?.name || initial.client_name,
      project_address: initial.project_address,
      substrate: Array.from(new Set(areas.map(a => a.substrate).filter(Boolean))).join(', '),
      system_name: sysNames.join(', '),
      area_sf: pricing.area_sf,
      area_note: '', duration_estimate: '',
      sections: [{
        label: 'Scope of work',
        line_items: pricing.areas.map((p, i) => ({
          description: `${areas[i].name} — ${p.area_sf.toLocaleString()} SF${p.system_name ? ` · ${p.system_name}` : ''}`,
          sub_note: [areas[i].substrate && `Substrate: ${areas[i].substrate}`, `Prep: ${areas[i].prep_tier}`, areas[i].notes].filter(Boolean).join(' · '),
          qty: 1, unit: 'lot', unit_cost: p.pre_tax, total: p.pre_tax,
        })),
        subtotal: pricing.pre_tax_total,
      }],
      direct_cost_subtotal: pricing.pre_tax_total,
      overhead_pct: 0, overhead_amount: 0, profit_pct: 0, profit_amount: 0,
      tax_rate: +(taxRate * 100).toFixed(4), tax_amount: pricing.tax_amount, total: pricing.total, per_sf: pricing.per_sf,
      assumptions: [], exclusions: [], system_note: '',
      valid_until: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    };
  };

  const handleSave = async () => {
    if (!effectiveContactId) { toast.error('Select or add a client first'); return; }
    if (unmatched) { toast.error('Every area needs a system so it can be priced'); return; }
    if (areas.some(a => !(a.area_sf > 0))) { toast.error('Every area needs a square footage'); return; }
    const doc = buildDoc();
    try {
      const largest = [...areas].sort((a, b) => b.area_sf - a.area_sf)[0];
      const saved = await saveEstimate.mutateAsync({
        contact_id: effectiveContactId,
        project_id: projectId || null,
        line_items: doc as any,
        system_id: largest.system_id,
        area_sf: pricing.area_sf,
        subtotal: pricing.pre_tax_total,
        tax_rate: taxRate,
        direct_cost_subtotal: pricing.direct_cost_subtotal,
        overhead_amount: pricing.overhead_amount,
        profit_amount: pricing.profit_amount,
        pre_tax_total: pricing.pre_tax_total,
        tax_amount: pricing.tax_amount,
        total: pricing.total,
        valid_until: doc.valid_until,
        model_used: initial.model_used,
        prompt: initial.prompt,
        status: 'Pending',
      });
      toast.success('Estimate saved');
      onClose();
      if (saved?.id) navigate(`/estimates/${saved.id}`);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Estimate from scope</span>
        <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground"><X size={16} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <input className={`${inputCls} w-full text-sm font-serif`} value={title} onChange={e => setTitle(e.target.value)} />

        <div className="flex gap-2">
          <select className={`${inputCls} flex-1`} value={effectiveContactId} onChange={e => setContactId(e.target.value)}>
            <option value="">{initial.client_name ? `Client: "${initial.client_name}" — select…` : 'Select client…'}</option>
            {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button type="button" onClick={() => setContactOpen(true)} className="px-2 rounded-lg border border-primary/40 text-primary" aria-label="Add contact"><UserPlus size={14} /></button>
        </div>
        <select className={`${inputCls} w-full`} value={projectId} onChange={e => setProjectId(e.target.value)}>
          <option value="">No project</option>
          {projects.filter(p => !effectiveContactId || !p.contact_id || p.contact_id === effectiveContactId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <QuickContactDialog open={contactOpen} onOpenChange={setContactOpen} initialName={initial.client_name}
          onCreated={(c) => setContactId(c.id)} />

        {areas.map((a, i) => {
          const p = pricing.areas[i];
          return (
            <div key={i} className="bg-card border border-border rounded-xl p-3 space-y-2">
              <div className="flex gap-2">
                <input className={`${inputCls} flex-1 font-bold`} value={a.name} onChange={e => update(i, { name: e.target.value })} />
                <input type="number" min="0" className={`${inputCls} w-20 text-right`} value={a.area_sf || ''} onChange={e => update(i, { area_sf: parseFloat(e.target.value) || 0 })} />
                <span className="text-[10px] text-muted-foreground self-center">SF</span>
                <button onClick={() => setAreas(areas.filter((_, j) => j !== i))} className="text-destructive p-1" aria-label="Remove area"><Trash2 size={13} /></button>
              </div>
              <div className="flex gap-2">
                <select className={`${inputCls} flex-1 ${!sysById(a.system_id) ? 'border-warning' : ''}`} value={a.system_id || ''} onChange={e => update(i, { system_id: e.target.value || null })}>
                  <option value="">— pick system —</option>
                  {systems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select className={inputCls} value={a.prep_tier} onChange={e => update(i, { prep_tier: e.target.value as ScopeArea['prep_tier'] })}>
                  {PREP_TIERS.map(t => <option key={t} value={t}>{t} prep</option>)}
                </select>
              </div>
              <input className={`${inputCls} w-full`} placeholder="Substrate" value={a.substrate} onChange={e => update(i, { substrate: e.target.value })} />
              <textarea className={`${inputCls} w-full h-12 resize-none`} placeholder="Client-facing notes" value={a.notes} onChange={e => update(i, { notes: e.target.value })} />
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">{p?.rule_note || (sysById(a.system_id) ? '' : 'Needs a system to price')}</span>
                <span className="font-mono text-foreground">{money(p?.pre_tax || 0)}</span>
              </div>
            </div>
          );
        })}
        <button onClick={() => setAreas([...areas, { name: 'New area', area_sf: 0, system_id: null, substrate: '', prep_tier: 'standard', notes: '' }])}
          className="w-full py-2 border border-dashed border-border text-muted-foreground rounded-xl text-[10px] uppercase tracking-widest font-bold flex items-center justify-center gap-1"><Plus size={12} /> Add area</button>

        <div className="bg-card border border-border rounded-xl p-3 space-y-1 text-xs">
          <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{money(pricing.pre_tax_total)}</span></div>
          <div className="flex justify-between text-muted-foreground"><span>Tax ({pctLabel(taxRate)}%)</span><span>{money(pricing.tax_amount)}</span></div>
          <div className="flex justify-between font-serif text-primary text-base"><span>Total</span><span>{money(pricing.total)}</span></div>
          <div className="flex justify-between text-muted-foreground"><span>{pctLabel(settings.default_deposit_pct)}% Deposit</span><span>{money(depositAmount(pricing.total, settings.default_deposit_pct))}</span></div>
        </div>

        <CostBreakdown b={pricing} ruleAdjustment={pricing.rule_adjustment} />
        <p className="text-[9px] text-muted-foreground">Scope read by {initial.model_used}. Prices calculated by the app from your Systems and Settings.</p>
      </div>
      <div className="p-3 border-t border-border">
        <button onClick={handleSave} disabled={saveEstimate.isPending}
          className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-glow disabled:opacity-50">
          {saveEstimate.isPending ? 'Saving…' : 'Save Estimate'}
        </button>
      </div>
    </div>
  );
};
