import { parseLocalDate, todayLocal, daysFromTodayLocal } from '@/lib/utils';
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Search, Trash2, Shield, UserPlus } from 'lucide-react';
import { QuickContactDialog, QuickProjectDialog } from '@/components/QuickCreateDialogs';

const NEW_PROJECT = '__new_project__';
import { useContacts } from '@/hooks/useContacts';
import { useProjects } from '@/hooks/useProjects';
import { useSaveEstimate, useEstimate } from '@/hooks/useEstimates';
import { useSystems } from '@/hooks/useSystems';
import { useServices } from '@/hooks/useServices';
import { priceLines, materialUnits, materialCost, r2, type EstimateLine } from '@/lib/pricing';
import { useSettings, renderTerms, depositAmount, pctLabel } from '@/hooks/useSettings';
import { toast } from 'sonner';

interface Area {
  id: string;
  name: string;
  service_id: string;
  qty: number;
  rate: number;
  /** Optional system for materials (only when the service bills materials separately). */
  system_id: string;
  /** SF used for the materials quantity when the service is priced per day. */
  materials_sf: number;
  /** User override of the materials amount; null = use calculated. */
  materials_amount: number | null;
  note: string | null;
}

interface OtherLine {
  id: string;
  description: string;
  amount: number;
}

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const emptyArea = (): Area => ({ id: newId(), name: '', service_id: '', qty: 0, rate: 0, system_id: '', materials_sf: 0, materials_amount: null, note: null });

const EstimateCreate: React.FC = () => {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const isEdit = !!editId;
  const { data: existing, isLoading: loadingExisting } = useEstimate(editId || '');
  const { data: contacts = [] } = useContacts();
  const { data: projects = [] } = useProjects();
  const saveEstimate = useSaveEstimate();
  const { settings, isSuccess: settingsLoaded } = useSettings();

  const [step, setStep] = useState<'select-context' | 'create'>(isEdit ? 'create' : 'select-context');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const { data: systems = [] } = useSystems();
  const { data: services = [] } = useServices();
  const [areas, setAreas] = useState<Area[]>([emptyArea()]);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [otherLines, setOtherLines] = useState<OtherLine[]>([]);
  const [notes, setNotes] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [defaultsApplied, setDefaultsApplied] = useState(false);
  // Apply user defaults to new estimates once settings load
  useEffect(() => {
    if (isEdit || defaultsApplied || !settingsLoaded) return;
    setTaxRate(+(Number(settings.default_tax_rate) * 100).toFixed(4));
    setNotes(`${pctLabel(settings.default_deposit_pct)}% deposit required to schedule.`);
    setDefaultsApplied(true);
  }, [isEdit, defaultsApplied, settingsLoaded, settings]);
  const [validUntil, setValidUntil] = useState<string>(
    daysFromTodayLocal(30)
  );
  const [showTerms, setShowTerms] = useState(false);

  // Hydrate from existing estimate when editing
  useEffect(() => {
    if (!isEdit || !existing) return;
    setSelectedContactId(existing.contact_id || '');
    setSelectedProjectId(existing.project_id || '');
    const items = Array.isArray(existing.line_items) ? (existing.line_items as any[]) : [];
    const isNew = items.some((li: any) => li && (li.kind === 'service' || li.kind === 'materials' || li.kind === 'other'));
    if (isNew) {
      const byArea = new Map<string, Area>();
      const others: OtherLine[] = [];
      for (const li of items) {
        if (li.kind === 'other') { others.push({ id: String(li.id ?? newId()), description: li.description ?? '', amount: Number(li.amount ?? 0) }); continue; }
        const aid = String(li.area_id ?? li.id ?? newId());
        const a = byArea.get(aid) ?? { ...emptyArea(), id: aid, name: li.area_name ?? '' };
        if (li.kind === 'service') {
          Object.assign(a, { service_id: li.service_id ?? '', qty: Number(li.qty ?? 0), rate: Number(li.rate ?? 0), note: li.note ?? null });
        } else {
          Object.assign(a, { system_id: li.system_id ?? '', materials_amount: Number(li.amount ?? 0), materials_sf: Number(li.materials_sf ?? 0) });
        }
        byArea.set(aid, a);
      }
      setAreas(byArea.size ? [...byArea.values()] : [emptyArea()]);
      setOtherLines(others);
    } else {
      // Older estimates: load every line as an 'other' line at face value.
      setAreas([]);
      setOtherLines(items.map((li: any, i) => ({
        id: String(li.id ?? i + 1),
        description: [li.scope ?? li.description ?? li.label ?? '', li.materials ? `Materials: ${li.materials}` : ''].filter(Boolean).join('\n'),
        amount: Number(li.amount ?? li.total ?? 0),
      })));
    }
    setNotes(existing.notes ?? '');
    setTaxRate(Number(existing.tax_rate ?? 0) * 100);
    if (existing.valid_until) setValidUntil(existing.valid_until);
  }, [isEdit, existing]);

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) || (c.email || '').toLowerCase().includes(clientSearchTerm.toLowerCase())
  );

  const selectedContact = contacts.find(c => c.id === selectedContactId);
  const filteredProjects = useMemo(
    () => projects.filter(p =>
      (p.status === 'Active' || p.status === 'Bidding') &&
      (!selectedContactId || !p.contact_id || p.contact_id === selectedContactId)
    ),
    [projects, selectedContactId]
  );

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    if (projectId) {
      const project = projects.find(p => p.id === projectId);
      if (project?.contact_id) setSelectedContactId(project.contact_id);
    }
  };

  const updateArea = (id: string, patch: Partial<Area>) =>
    setAreas(prev => prev.map(a => (a.id === id ? { ...a, ...patch } : a)));
  const pickService = (id: string, serviceId: string) => {
    const svc = services.find(s => s.id === serviceId);
    updateArea(id, {
      service_id: serviceId,
      rate: svc ? Number(svc.rate_default) : 0,
      ...(svc?.materials_included ? { system_id: '', materials_amount: null } : {}),
    });
  };
  const updateOther = (id: string, patch: Partial<OtherLine>) =>
    setOtherLines(prev => prev.map(l => (l.id === id ? { ...l, ...patch } : l)));

  const taxFraction = (Number(taxRate) || 0) / 100;

  /** Flatten areas + other lines into priced estimate lines. */
  const rawLines = useMemo<EstimateLine[]>(() => {
    const out: EstimateLine[] = [];
    for (const a of areas) {
      const svc = services.find(s => s.id === a.service_id);
      if (!svc) continue;
      const unit = svc.pricing_unit === 'day' ? 'day' : 'SF';
      out.push({
        id: `${a.id}-svc`, kind: 'service', service_id: svc.id, system_id: svc.system_id ?? null,
        description: [a.name, svc.name].filter(Boolean).join(' — '),
        qty: Number(a.qty) || 0, unit, rate: Number(a.rate) || 0, amount: 0, note: a.note,
        area_id: a.id, area_name: a.name, materials_included: svc.materials_included,
      });
      if (!svc.materials_included && a.system_id) {
        const sys = systems.find(s => s.id === a.system_id) || null;
        const sf = unit === 'SF' ? Number(a.qty) || 0 : Number(a.materials_sf) || 0;
        const units = materialUnits(sys as any, sf, settings.default_waste_factor);
        const calc = materialCost(sys as any, sf, settings.default_waste_factor);
        out.push({
          id: `${a.id}-mat`, kind: 'materials', service_id: null, system_id: a.system_id,
          description: `Materials at cost${sys ? ` — ${sys.name}` : ''}`,
          qty: units, unit: 'lot', rate: Number(sys?.cost_per_unit) || 0,
          amount: a.materials_amount != null ? a.materials_amount : calc, note: null,
          area_id: a.id, area_name: a.name, ...(unit === 'day' ? { materials_sf: sf } : {}),
        } as EstimateLine);
      }
    }
    for (const l of otherLines) {
      out.push({ id: l.id, kind: 'other', service_id: null, system_id: null, description: l.description, qty: 1, unit: 'lot', rate: Number(l.amount) || 0, amount: Number(l.amount) || 0, note: null });
    }
    return out;
  }, [areas, otherLines, services, systems, settings.default_waste_factor]);

  const pricing = useMemo(
    () => priceLines(rawLines, services.map(s => ({ id: s.id, minimum_charge: Number(s.minimum_charge) })), taxFraction),
    [rawLines, services, taxFraction],
  );
  const lineFor = (id: string) => pricing.lines.find(l => l.id === id);
  const total = pricing.total;
  const deposit = depositAmount(total, settings.default_deposit_pct);

  const handleSave = async () => {
    if (!selectedContactId) {
      toast.error('Select a client first');
      return;
    }
    const items = pricing.lines.filter(l => l.amount !== 0 || (l.kind === 'service' && l.qty > 0));
    if (!items.length) {
      toast.error('Add an area with a service, or a line item');
      return;
    }
    try {
      const sfTotal = r2(items.filter(l => l.kind === 'service' && l.unit === 'SF').reduce((s, l) => s + l.qty, 0));
      const firstSystem = items.find(l => l.kind === 'materials')?.system_id ?? null;
      const saved = await saveEstimate.mutateAsync({
        ...(isEdit && existing ? { id: existing.id } : {}),
        contact_id: selectedContactId,
        project_id: selectedProjectId || null,
        line_items: items as any,
        system_id: firstSystem,
        area_sf: sfTotal > 0 ? sfTotal : null,
        subtotal: pricing.subtotal,
        tax_rate: taxFraction,
        direct_cost_subtotal: pricing.materials_total,
        overhead_amount: 0,
        profit_amount: 0,
        pre_tax_total: pricing.subtotal,
        tax_amount: pricing.tax_amount,
        total: pricing.total,
        notes: notes || null,
        status: existing?.status ?? 'Pending',
        valid_until: validUntil || null,
      });
      toast.success(isEdit ? 'Estimate updated' : 'Estimate saved');
      if (saved?.id) navigate(`/estimates/${saved.id}`);
      else navigate('/estimates');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to save estimate');
    }
  };

  // Cmd/Ctrl+S to save when on the create/edit step
  useEffect(() => {
    if (step !== 'create') return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!saveEstimate.isPending) handleSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selectedContactId, pricing, taxRate, validUntil, notes, selectedProjectId, saveEstimate.isPending]);

  if (isEdit && loadingExisting) {
    return <div className="text-center py-20 text-muted-foreground text-sm">Loading...</div>;
  }

  if (step === 'select-context') {
    return (
      <div className="space-y-4 animate-fade-in max-w-2xl mx-auto">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/estimates')} className="p-1.5 hover:bg-accent rounded-full text-muted-foreground"><ChevronLeft size={20} /></button>
          <h2 className="text-xl font-serif text-foreground">New Estimate</h2>
        </div>

        <div>
          <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Project (optional)</label>
          <select value={selectedProjectId} onChange={e => e.target.value === NEW_PROJECT ? setProjectDialogOpen(true) : handleProjectChange(e.target.value)}
            className="w-full bg-card border border-border rounded-xl py-2.5 px-4 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary">
            <option value="">No Project</option>
            {filteredProjects.map(p => (
              <option key={p.id} value={p.id}>{p.name}{contacts.find(c => c.id === p.contact_id) ? ` — ${contacts.find(c => c.id === p.contact_id)!.name}` : ''}</option>
            ))}
            <option value={NEW_PROJECT}>+ Add new project…</option>
          </select>
          <QuickProjectDialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen} contacts={contacts}
            defaultContactId={selectedContactId}
            onCreated={(p) => { setSelectedProjectId(p.id); if (p.contact_id) setSelectedContactId(p.contact_id); }} />
          <QuickContactDialog open={contactDialogOpen} onOpenChange={setContactDialogOpen} initialName={clientSearchTerm}
            onCreated={(c) => { setSelectedContactId(c.id); setClientSearchTerm(''); setStep('create'); }} />
        </div>

        {selectedProjectId && selectedContactId ? (
          <div className="space-y-3">
            <div className="p-4 bg-card border border-primary/20 rounded-xl">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Client (from project)</p>
              <h3 className="font-bold text-foreground text-sm">{selectedContact?.name}</h3>
              <p className="text-[10px] text-muted-foreground">{selectedContact?.email}</p>
            </div>
            <button onClick={() => setStep('create')}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-glow">
              Continue
            </button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input type="text" placeholder="Search clients..." value={clientSearchTerm} onChange={e => setClientSearchTerm(e.target.value)}
                className="w-full bg-card border border-border rounded-xl py-2.5 pl-10 pr-4 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary" />
            </div>
            {filteredContacts.length === 0 ? (
              <div className="text-center py-10 bg-card rounded-xl border border-dashed border-border space-y-3">
                <p className="text-muted-foreground text-[11px]">{contacts.length === 0 ? 'No contacts yet.' : 'No matching contacts.'}</p>
                <button type="button" onClick={() => setContactDialogOpen(true)}
                  className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-glow">
                  <UserPlus size={14} /> Add Contact
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredContacts.map(contact => (
                  <button key={contact.id} onClick={() => { setSelectedContactId(contact.id); setStep('create'); }}
                    className="p-4 bg-card border border-border rounded-xl hover:border-primary/50 text-left transition-all">
                    <h3 className="font-bold text-foreground text-sm">{contact.name}</h3>
                    <p className="text-[10px] text-muted-foreground">{contact.email}</p>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => isEdit ? navigate(`/estimates/${editId}`) : setStep('select-context')} className="p-1.5 hover:bg-accent rounded-full text-muted-foreground"><ChevronLeft size={18} /></button>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{isEdit ? 'Edit Estimate' : 'New Estimate'}</p>
          <p className="text-xs text-foreground">{selectedContact?.name}</p>
          {selectedProjectId && <p className="text-[9px] text-primary">{projects.find(p => p.id === selectedProjectId)?.name}</p>}
        </div>
        <button onClick={handleSave} disabled={saveEstimate.isPending}
          className="bg-primary text-primary-foreground px-4 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-glow disabled:opacity-50">
          {saveEstimate.isPending ? 'Saving...' : isEdit ? 'Update' : 'Save'}
        </button>
      </div>

      <div className="space-y-3">
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Areas</p>
        {areas.map(a => {
          const svc = services.find(s => s.id === a.service_id);
          const unitWord = svc?.pricing_unit === 'day' ? 'days' : 'SF';
          const svcLine = lineFor(`${a.id}-svc`);
          const matLine = lineFor(`${a.id}-mat`);
          const outOfRange = svc && (Number(a.rate) < Number(svc.rate_low) || Number(a.rate) > Number(svc.rate_high));
          const sys = systems.find(s => s.id === a.system_id);
          return (
            <div key={a.id} className="bg-card p-3 rounded-xl border border-border space-y-2">
              <div className="flex gap-2 items-center">
                <input placeholder="Area name (e.g. Primary shower)" value={a.name} onChange={e => updateArea(a.id, { name: e.target.value })}
                  className="flex-1 bg-accent border border-border rounded-lg p-2 text-foreground text-xs outline-none" />
                <button onClick={() => setAreas(areas.filter(x => x.id !== a.id))} className="text-destructive p-1.5" aria-label="Remove area"><Trash2 size={14} /></button>
              </div>
              <select value={a.service_id} onChange={e => pickService(a.id, e.target.value)}
                className="w-full bg-accent border border-border rounded-lg p-2 text-foreground text-xs outline-none">
                <option value="">Pick a service…</option>
                {services.filter(s => s.is_active || s.id === a.service_id).map(s => (
                  <option key={s.id} value={s.id}>{s.name} — ${Number(s.rate_default).toLocaleString()} {s.pricing_unit === 'day' ? 'per day' : 'per SF'}</option>
                ))}
              </select>
              {svc && (
                <>
                  <div className="flex gap-2 items-center text-[11px]">
                    <input type="number" inputMode="decimal" min="0" value={a.qty || ''} placeholder={unitWord}
                      onChange={e => updateArea(a.id, { qty: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                      className="w-20 bg-accent border border-border rounded-lg p-2 text-right text-foreground text-xs outline-none" />
                    <span className="text-muted-foreground">{unitWord} ×</span>
                    <span className="text-muted-foreground">$</span>
                    <input type="number" inputMode="decimal" min="0" step="0.01" value={Number.isFinite(a.rate) ? a.rate : 0}
                      onChange={e => updateArea(a.id, { rate: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                      className="w-20 bg-accent border border-border rounded-lg p-2 text-right text-foreground text-xs outline-none" />
                    <span className="text-muted-foreground">{svc.pricing_unit === 'day' ? '/day' : '/SF'}</span>
                    <span className="ml-auto font-mono text-primary text-xs">${(svcLine?.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  {svc.materials_included && <span className="inline-block text-[9px] uppercase tracking-widest font-bold text-primary border border-primary/40 rounded px-1.5 py-0.5">Materials included</span>}
                  {outOfRange && <p className="text-[10px] text-warning">Rate is outside your usual ${Number(svc.rate_low).toLocaleString()}–${Number(svc.rate_high).toLocaleString()} range.</p>}
                  {svcLine?.note && <p className="text-[10px] text-warning">{svcLine.note}</p>}
                  {!svc.materials_included && (
                    <div className="space-y-1.5 border-t border-border pt-2">
                      <select value={a.system_id} onChange={e => updateArea(a.id, { system_id: e.target.value, materials_amount: null })}
                        className="w-full bg-accent border border-border rounded-lg p-2 text-foreground text-xs outline-none">
                        <option value="">No materials line (optional: pick a system)</option>
                        {systems.filter(s => s.is_active !== false || s.id === a.system_id).map(s => (
                          <option key={s.id} value={s.id}>{s.name}{s.manufacturer ? ` — ${s.manufacturer}` : ''}</option>
                        ))}
                      </select>
                      {a.system_id && svc.pricing_unit === 'day' && (
                        <div className="flex gap-2 items-center text-[10px] text-muted-foreground">
                          <span>SF for materials</span>
                          <input type="number" inputMode="decimal" min="0" value={a.materials_sf || ''}
                            onChange={e => updateArea(a.id, { materials_sf: e.target.value === '' ? 0 : parseFloat(e.target.value), materials_amount: null })}
                            className="w-20 bg-accent border border-border rounded-lg p-1.5 text-right text-foreground text-xs outline-none" />
                        </div>
                      )}
                      {matLine && (
                        <div className="flex gap-2 items-center text-[11px]">
                          <span className="text-muted-foreground flex-1">Materials at cost{matLine.qty ? ` · ${matLine.qty} ${sys?.coverage_unit || 'units'}` : ''}</span>
                          <span className="text-muted-foreground">$</span>
                          <input type="number" inputMode="decimal" min="0" step="0.01" value={matLine.amount}
                            onChange={e => updateArea(a.id, { materials_amount: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                            className="w-24 bg-accent border border-border rounded-lg p-1.5 text-right text-primary font-mono text-xs outline-none" />
                        </div>
                      )}
                      {sys && !(Number(sys.coverage_rate) > 0 && sys.cost_per_unit != null) && (
                        <p className="text-[10px] text-warning">This system is missing coverage or cost per unit — enter the materials amount yourself or fill them in on the Systems page.</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
        <button onClick={() => setAreas([...areas, emptyArea()])}
          className="w-full py-2 border border-dashed border-border text-muted-foreground rounded-xl hover:text-foreground text-[10px] uppercase tracking-widest font-bold">+ Add Area</button>
      </div>

      <div className="space-y-3">
        {otherLines.map(l => (
          <div key={l.id} className="bg-card p-3 rounded-xl border border-border flex gap-2 items-start">
            <textarea placeholder="Line item description..." className="flex-1 bg-accent border border-border rounded-lg p-2 text-foreground text-[11px] outline-none resize-none h-12"
              value={l.description} onChange={e => updateOther(l.id, { description: e.target.value })} />
            <span className="text-muted-foreground text-[10px] pt-2">$</span>
            <input type="number" inputMode="decimal" step="0.01" className="bg-accent border border-border rounded-lg p-1.5 text-right text-primary font-mono text-xs w-24 outline-none"
              value={Number.isFinite(l.amount) ? l.amount : 0}
              onChange={e => updateOther(l.id, { amount: e.target.value === '' ? 0 : parseFloat(e.target.value) })} />
            <button onClick={() => setOtherLines(otherLines.filter(x => x.id !== l.id))} className="text-destructive p-1.5" aria-label="Remove line"><Trash2 size={14} /></button>
          </div>
        ))}
        <button onClick={() => setOtherLines([...otherLines, { id: newId(), description: '', amount: 0 }])}
          className="w-full py-2 border border-dashed border-border text-muted-foreground rounded-xl hover:text-foreground text-[10px] uppercase tracking-widest font-bold">+ Add Line Item</button>
      </div>

      <div className="bg-card p-4 rounded-xl space-y-2 border border-border">
        <div className="flex justify-between items-center text-[10px]">
          <span className="text-muted-foreground font-bold uppercase tracking-widest">Tax (%)</span>
          <input type="number" inputMode="decimal" className="bg-accent border border-border rounded px-2 py-1 text-right w-16 text-xs text-foreground outline-none"
            value={taxRate} onChange={e => setTaxRate(e.target.value === '' ? 0 : parseFloat(e.target.value))} />
        </div>
        <div className="flex justify-between items-center text-[10px]">
          <span className="text-muted-foreground font-bold uppercase tracking-widest">Valid Until</span>
          <input type="date" className="bg-accent border border-border rounded px-2 py-1 text-xs text-foreground outline-none"
            value={validUntil} onChange={e => setValidUntil(e.target.value)} />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t border-border">
          <span>Subtotal</span>
          <span>${pricing.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        {pricing.tax_amount > 0 && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Tax</span>
            <span>${pricing.tax_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-serif text-primary">
          <span className="text-sm">Estimate Total</span>
          <span className="text-base">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{pctLabel(settings.default_deposit_pct)}% Deposit</span>
          <span>${deposit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      <div>
        <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          className="w-full bg-card border border-border rounded-xl p-3 text-foreground text-[11px] outline-none resize-none h-16 focus:ring-1 focus:ring-primary" />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <button onClick={() => setShowTerms(!showTerms)} className="w-full flex items-center justify-between p-3 text-left">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Terms & Conditions</span>
          </div>
          <span className="text-[10px] text-primary font-bold">{showTerms ? 'Hide' : 'Show'}</span>
        </button>
        {showTerms && (
          <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
            {renderTerms(settings).map((text, key) => (
              <p key={key} className="text-[10px] text-muted-foreground leading-relaxed">{text}</p>
            ))}
            <p className="text-[9px] text-muted-foreground/60 italic pt-1 border-t border-border">
              These terms are automatically included on all estimates generated by {settings.company_name}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EstimateCreate;
