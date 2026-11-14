import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Trash2, UserPlus, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useContacts } from '@/hooks/useContacts';
import { useProjects } from '@/hooks/useProjects';
import { useSystems } from '@/hooks/useSystems';
import { useServices } from '@/hooks/useServices';
import { useSaveEstimate } from '@/hooks/useEstimates';
import { useSettings, pctLabel, depositAmount } from '@/hooks/useSettings';
import { priceLines, materialUnits, materialCost, r2, type EstimateLine } from '@/lib/pricing';
import { PREP_TIERS, type EstimateScope, type ScopeArea } from '@/lib/scopeSchema';
import { QuickContactDialog } from '@/components/QuickCreateDialogs';

const money = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const inputCls = 'bg-accent border border-border rounded-lg p-1.5 text-foreground text-[11px] outline-none focus:ring-1 focus:ring-primary';

type Area = ScopeArea & { rate: number | null };

export const ScopePreview: React.FC<{ initial: EstimateScope; onClose: () => void }> = ({ initial, onClose }) => {
  const navigate = useNavigate();
  const { data: contacts = [] } = useContacts();
  const { data: projects = [] } = useProjects();
  const { data: systems = [] } = useSystems();
  const { data: services = [] } = useServices();
  const { settings } = useSettings();
  const saveEstimate = useSaveEstimate();

  const [areas, setAreas] = useState<Area[]>(initial.areas.map(a => ({ ...a, system_id: a.system_id ?? null, rate: null })));
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

  const activeServices = services.filter(s => s.is_active);
  const svcById = (id: string | null) => services.find(s => s.id === id) || null;
  const taxRate = Number(settings.default_tax_rate);
  const rateOf = (a: Area) => a.rate ?? Number(svcById(a.service_id)?.rate_default ?? 0);

  const rawLines = useMemo<EstimateLine[]>(() => {
    const out: EstimateLine[] = [];
    areas.forEach((a, i) => {
      const svc = svcById(a.service_id);
      if (!svc) return;
      const unit = svc.pricing_unit === 'day' ? 'day' : 'SF';
      out.push({
        id: `a${i}-svc`, kind: 'service', service_id: svc.id, system_id: svc.system_id ?? null,
        description: [a.name, svc.name].filter(Boolean).join(' — '),
        qty: Number(a.qty) || 0, unit, rate: rateOf(a), amount: 0,
        note: [a.substrate && `Substrate: ${a.substrate}`, `Prep: ${a.prep_tier}`, a.notes].filter(Boolean).join(' · ') || null,
        area_id: `a${i}`, area_name: a.name, materials_included: svc.materials_included,
      });
      if (!svc.materials_included && a.system_id && unit === 'SF') {
        const sys = systems.find(s => s.id === a.system_id) || null;
        const sf = Number(a.qty) || 0;
        out.push({
          id: `a${i}-mat`, kind: 'materials', service_id: null, system_id: a.system_id,
          description: `Materials at cost${sys ? ` — ${sys.name}` : ''}`,
          qty: materialUnits(sys as any, sf, settings.default_waste_factor), unit: 'lot', rate: Number(sys?.cost_per_unit) || 0,
          amount: materialCost(sys as any, sf, settings.default_waste_factor), note: null,
          area_id: `a${i}`, area_name: a.name,
        });
      }
    });
    return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areas, services, systems, settings.default_waste_factor]);

  const pricing = useMemo(
    () => priceLines(rawLines, services.map(s => ({ id: s.id, minimum_charge: Number(s.minimum_charge) })), taxRate),
    [rawLines, services, taxRate],
  );
  const areaTotal = (i: number) => pricing.lines.filter(l => l.area_id === `a${i}`).reduce((s, l) => s + l.amount, 0);

  const update = (i: number, patch: Partial<Area>) => setAreas(prev => prev.map((a, j) => j === i ? { ...a, ...patch } : a));
  const unmatchedNames = initial.areas.filter(a => !a.service_id && a.unmatched_service).map(a => a.unmatched_service as string);

  const handleSave = async () => {
    if (!effectiveContactId) { toast.error('Select or add a client first'); return; }
    if (areas.some(a => !svcById(a.service_id))) { toast.error('Every area needs a service so it can be priced'); return; }
    if (areas.some(a => !(a.qty > 0))) { toast.error('Every area needs a quantity'); return; }
    const items = pricing.lines;
    try {
      const sfTotal = r2(items.filter(l => l.kind === 'service' && l.unit === 'SF').reduce((s, l) => s + l.qty, 0));
      const saved = await saveEstimate.mutateAsync({
        contact_id: effectiveContactId,
        project_id: projectId || null,
        line_items: items as any,
        system_id: items.find(l => l.kind === 'materials')?.system_id ?? null,
        area_sf: sfTotal > 0 ? sfTotal : null,
        subtotal: pricing.subtotal,
        tax_rate: taxRate,
        direct_cost_subtotal: pricing.materials_total,
        overhead_amount: 0,
        profit_amount: 0,
        pre_tax_total: pricing.subtotal,
        tax_amount: pricing.tax_amount,
        total: pricing.total,
        valid_until: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
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

        {unmatchedNames.length > 0 && (
          <div className="flex gap-2 items-start bg-warning/10 border border-warning/40 rounded-lg p-2 text-[11px] text-foreground">
            <AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" />
            <span>Couldn't match to your price book: {unmatchedNames.map(n => `"${n}"`).join(', ')}. Pick a service below.</span>
          </div>
        )}

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
          const svc = svcById(a.service_id);
          const unitLabel = svc ? (svc.pricing_unit === 'day' ? 'days' : 'SF') : a.unit === 'day' ? 'days' : 'SF';
          const rate = rateOf(a);
          const outOfRange = svc && (rate < Number(svc.rate_low) || rate > Number(svc.rate_high)) && Number(svc.rate_high) > 0;
          return (
            <div key={i} className="bg-card border border-border rounded-xl p-3 space-y-2">
              <div className="flex gap-2">
                <input className={`${inputCls} flex-1 font-bold`} value={a.name} onChange={e => update(i, { name: e.target.value })} />
                <button onClick={() => setAreas(areas.filter((_, j) => j !== i))} className="text-destructive p-1" aria-label="Remove area"><Trash2 size={13} /></button>
              </div>
              <select className={`${inputCls} w-full ${!svc ? 'border-warning' : ''}`} value={a.service_id || ''}
                onChange={e => { const s = svcById(e.target.value || null); update(i, { service_id: e.target.value || null, rate: null, unit: s?.pricing_unit === 'day' ? 'day' : 'SF' }); }}>
                <option value="">{a.unmatched_service ? `— no match for "${a.unmatched_service}" —` : '— pick service —'}</option>
                {activeServices.map(s => <option key={s.id} value={s.id}>{s.name} ({s.pricing_unit === 'day' ? 'per day' : 'per SF'})</option>)}
              </select>
              <div className="flex gap-2 items-center">
                <input type="number" min="0" className={`${inputCls} w-20 text-right`} value={a.qty || ''} onChange={e => update(i, { qty: parseFloat(e.target.value) || 0 })} aria-label="Quantity" />
                <span className="text-[10px] text-muted-foreground">{unitLabel} ×</span>
                <span className="text-[10px] text-muted-foreground">$</span>
                <input type="number" min="0" step="0.01" className={`${inputCls} w-20 text-right ${outOfRange ? 'border-warning' : ''}`} value={svc ? rate : ''} disabled={!svc}
                  onChange={e => update(i, { rate: parseFloat(e.target.value) || 0 })} aria-label="Rate" />
                <select className={`${inputCls} ml-auto`} value={a.prep_tier} onChange={e => update(i, { prep_tier: e.target.value as ScopeArea['prep_tier'] })}>
                  {PREP_TIERS.map(t => <option key={t} value={t}>{t} prep</option>)}
                </select>
              </div>
              {outOfRange && <p className="text-[10px] text-warning">Outside your usual range ({money(Number(svc!.rate_low))}–{money(Number(svc!.rate_high))})</p>}
              {svc && !svc.materials_included && unitLabel === 'SF' && (
                <select className={`${inputCls} w-full`} value={a.system_id || ''} onChange={e => update(i, { system_id: e.target.value || null })}>
                  <option value="">No materials line</option>
                  {systems.map(s => <option key={s.id} value={s.id}>Materials: {s.name}</option>)}
                </select>
              )}
              <input className={`${inputCls} w-full`} placeholder="Substrate" value={a.substrate} onChange={e => update(i, { substrate: e.target.value })} />
              <textarea className={`${inputCls} w-full h-12 resize-none`} placeholder="Client-facing notes" value={a.notes} onChange={e => update(i, { notes: e.target.value })} />
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">{svc ? '' : 'Needs a service to price'}</span>
                <span className="font-mono text-foreground">{money(areaTotal(i))}</span>
              </div>
            </div>
          );
        })}
        <button onClick={() => setAreas([...areas, { name: 'New area', service_id: null, unmatched_service: null, qty: 0, unit: 'SF', system_id: null, substrate: '', prep_tier: 'standard', notes: '', rate: null }])}
          className="w-full py-2 border border-dashed border-border text-muted-foreground rounded-xl text-[10px] uppercase tracking-widest font-bold flex items-center justify-center gap-1"><Plus size={12} /> Add area</button>

        <div className="bg-card border border-border rounded-xl p-3 space-y-1 text-xs">
          <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{money(pricing.subtotal)}</span></div>
          {pricing.tax_amount > 0 && <div className="flex justify-between text-muted-foreground"><span>Tax ({pctLabel(taxRate)}%)</span><span>{money(pricing.tax_amount)}</span></div>}
          <div className="flex justify-between font-serif text-primary text-base"><span>Total</span><span>{money(pricing.total)}</span></div>
          <div className="flex justify-between text-muted-foreground"><span>{pctLabel(settings.default_deposit_pct)}% Deposit</span><span>{money(depositAmount(pricing.total, settings.default_deposit_pct))}</span></div>
        </div>
        <p className="text-[9px] text-muted-foreground">Scope read by {initial.model_used}. Prices come from your Services price book.</p>
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
