import { parseLocalDate, todayLocal, daysFromTodayLocal } from '@/lib/utils';
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Search, Trash2, Shield, UserPlus, Clock, Palette } from 'lucide-react';
import { QuickContactDialog, QuickProjectDialog } from '@/components/QuickCreateDialogs';

const NEW_PROJECT = '__new_project__';
import { useContacts, useSaveContact } from '@/hooks/useContacts';
import { useProjects } from '@/hooks/useProjects';
import { useSaveEstimate, useEstimate } from '@/hooks/useEstimates';
import { useSystems } from '@/hooks/useSystems';
import { useServices } from '@/hooks/useServices';
import { priceLines, materialUnits, materialCost, materialHandling, r2, type EstimateLine } from '@/lib/pricing';
import { CUSTOM_MATCH_DISCLAIMER, CUSTOM_MATCH_FEE, CUSTOM_MATCH_LINE_ID } from '@/data/colorCatalog';
import { filterEstimateClientCandidates } from '@/lib/contactFilters';
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
  const [searchParams] = useSearchParams();
  const { id: editId } = useParams<{ id: string }>();
  const isEdit = !!editId;
  const { data: existing, isLoading: loadingExisting } = useEstimate(editId || '');
  const { data: contacts = [] } = useContacts();
  const saveContact = useSaveContact();
  const { data: projects = [] } = useProjects();
  const saveEstimate = useSaveEstimate();
  const { settings, isSuccess: settingsLoaded } = useSettings();

  const [step, setStep] = useState<'select-context' | 'create'>(isEdit ? 'create' : 'select-context');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [includeOutreachLeads, setIncludeOutreachLeads] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');

  // Pre-select contact or project from URL param (e.g. ?contactId=... or ?projectId=...)
  useEffect(() => {
    if (isEdit) return;
    const cid = searchParams.get('contactId');
    const pid = searchParams.get('projectId');
    if (cid) {
      setSelectedContactId(cid);
      setStep('create');
    }
    if (pid) {
      setSelectedProjectId(pid);
      const matchedProject = projects.find((p) => p.id === pid);
      if (matchedProject?.contact_id && !cid) {
        setSelectedContactId(matchedProject.contact_id);
      }
      setStep('create');
    }
  }, [isEdit, searchParams, projects]);
  const { data: systems = [] } = useSystems();
  const { data: services = [] } = useServices();
  const [areas, setAreas] = useState<Area[]>([emptyArea()]);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [otherLines, setOtherLines] = useState<OtherLine[]>([]);
  const [notes, setNotes] = useState('');
  const [durationEstimate, setDurationEstimate] = useState('');
  const [handlingRate, setHandlingRate] = useState(10);
  const [customMatch, setCustomMatch] = useState(false);
  const [taxRate, setTaxRate] = useState(0);
  const [showTaxInput, setShowTaxInput] = useState(false);
  const [defaultsApplied, setDefaultsApplied] = useState(false);
  // Apply user defaults to new estimates once settings load
  useEffect(() => {
    if (isEdit || defaultsApplied || !settingsLoaded) return;
    setTaxRate(+(Number(settings.default_tax_rate) * 100).toFixed(4));
    const configuredHandling = Number(settings.sundries_pct ?? 0.1);
    setHandlingRate(+(configuredHandling * 100).toFixed(2));
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
    const savedDuration = items.find((li: any) => li?.duration_estimate)?.duration_estimate;
    if (savedDuration) setDurationEstimate(String(savedDuration));
    const handlingItem = items.find((li: any) => li?.id === 'material-handling');
    if (handlingItem) {
      const pctMatch = String(handlingItem.description || '').match(/(\d+(?:\.\d+)?)%/);
      setHandlingRate(pctMatch ? parseFloat(pctMatch[1]) : 10);
    } else {
      setHandlingRate(0);
    }
    setCustomMatch(items.some((li: any) => li?.id === CUSTOM_MATCH_LINE_ID));
    const isNew = items.some((li: any) => li && (li.kind === 'service' || li.kind === 'materials' || li.kind === 'other'));
    if (isNew) {
      const byArea = new Map<string, Area>();
      const others: OtherLine[] = [];
      for (const li of items) {
        if (li.id === 'material-handling' || li.id === CUSTOM_MATCH_LINE_ID) continue;
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

  const filteredContacts = useMemo(
    () => filterEstimateClientCandidates(contacts, clientSearchTerm, includeOutreachLeads),
    [contacts, clientSearchTerm, includeOutreachLeads],
  );

  const outreachLeadCount = useMemo(
    () => contacts.filter((c) => c.type === 'Lead').length,
    [contacts],
  );

  const handlePickContact = async (contact: typeof contacts[0]) => {
    setSelectedContactId(contact.id);
    if (contact.type === 'Lead') {
      try {
        await saveContact.mutateAsync({
          ...contact,
          type: 'Client',
          status: 'Active',
          notes: contact.notes
            ? `${contact.notes}\n[Promoted to Client on ${new Date().toLocaleDateString()}]`
            : `[Promoted to Client on ${new Date().toLocaleDateString()}]`,
        });
        toast.success(`${contact.name} promoted from Potential Client to Client`);
      } catch {
        // non-blocking
      }
    }
    setStep('create');
  };

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
  const handlingFraction = Math.max(0, Number(handlingRate) || 0) / 100;

  const hasWaterproofScope = useMemo(() => {
    const wpRegex = /tadelakt|microcement|shower|waterproof/i;
    return areas.some((a) => {
      const svc = services.find((s) => s.id === a.service_id);
      const sys = systems.find((s) => s.id === a.system_id);
      return wpRegex.test(svc?.name || '') || wpRegex.test(sys?.name || '') || wpRegex.test(a.name || '');
    });
  }, [areas, services, systems]);

  /** Flatten areas + other lines into priced estimate lines. */
  const rawLines = useMemo<EstimateLine[]>(() => {
    const out: EstimateLine[] = [];
    let rawMaterialsTotal = 0;
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
        const matAmt = a.materials_amount != null ? a.materials_amount : calc;
        rawMaterialsTotal = r2(rawMaterialsTotal + Number(matAmt || 0));
        out.push({
          id: `${a.id}-mat`, kind: 'materials', service_id: null, system_id: a.system_id,
          description: `Materials at cost${sys ? ` — ${sys.name}` : ''}`,
          qty: units, unit: 'lot', rate: Number(sys?.cost_per_unit) || 0,
          amount: matAmt, note: null,
          area_id: a.id, area_name: a.name, ...(unit === 'day' ? { materials_sf: sf } : {}),
        } as EstimateLine);
      }
    }
    if (rawMaterialsTotal > 0 && handlingFraction > 0) {
      const handlingAmt = materialHandling(rawMaterialsTotal, handlingFraction);
      if (handlingAmt > 0) {
        out.push({
          id: 'material-handling',
          kind: 'other',
          service_id: null,
          system_id: null,
          description: `Material Handling & Procurement (${+(handlingFraction * 100).toFixed(2)}%)`,
          qty: 1,
          unit: 'lot',
          rate: handlingAmt,
          amount: handlingAmt,
          note: null,
        });
      }
    }
    if (customMatch) {
      out.push({
        id: CUSTOM_MATCH_LINE_ID,
        kind: 'other',
        service_id: null,
        system_id: null,
        description: 'Custom Paint Match Lab Fee (SW/BM Drawdown +7–10 Days)',
        qty: 1,
        unit: 'lot',
        rate: CUSTOM_MATCH_FEE,
        amount: CUSTOM_MATCH_FEE,
        note: null,
      });
    }
    for (const l of otherLines) {
      out.push({ id: l.id, kind: 'other', service_id: null, system_id: null, description: l.description, qty: 1, unit: 'lot', rate: Number(l.amount) || 0, amount: Number(l.amount) || 0, note: null });
    }
    return out;
  }, [areas, otherLines, services, systems, settings.default_waste_factor, handlingFraction, customMatch]);

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
    const filteredItems = pricing.lines.filter(l => l.amount !== 0 || (l.kind === 'service' && l.qty > 0));
    if (!filteredItems.length) {
      toast.error('Add an area with a service, or a line item');
      return;
    }
    const cleanDuration = durationEstimate.trim();
    const items = filteredItems.map((item, idx) =>
      idx === 0 && cleanDuration ? { ...item, duration_estimate: cleanDuration } : item
    );
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
            {outreachLeadCount > 0 && (
              <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                <span>Showing active Clients only</span>
                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none hover:text-foreground">
                  <input
                    type="checkbox"
                    checked={includeOutreachLeads}
                    onChange={(e) => setIncludeOutreachLeads(e.target.checked)}
                    className="accent-primary rounded"
                  />
                  <span>Include Outreach Leads ({outreachLeadCount})</span>
                </label>
              </div>
            )}
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
                {filteredContacts.map(contact => {
                  const isPotential = contact.type === 'Lead';
                  return (
                    <button key={contact.id} onClick={() => handlePickContact(contact)}
                      className="p-4 bg-card border border-border rounded-xl hover:border-primary/50 text-left transition-all">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-foreground text-sm truncate">{contact.name}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                          isPotential
                            ? 'bg-warning/15 text-warning border border-warning/30'
                            : 'bg-primary/10 text-primary border border-primary/25'
                        }`}>
                          {isPotential ? 'Potential' : 'Client'}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {contact.email || contact.phone || (isPotential ? 'Will promote to Client' : 'No email')}
                      </p>
                    </button>
                  );
                })}
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

      <div className="bg-card p-4 rounded-xl space-y-2.5 border border-border">
        {pricing.materials_total > 0 && (
          <div className="flex justify-between items-center text-[11px]">
            <div>
              <span className="text-muted-foreground font-bold uppercase tracking-widest">Material Handling (%)</span>
              <p className="text-[9px] text-muted-foreground/80">Fair procurement/handling fee on ${pricing.materials_total.toLocaleString(undefined, { minimumFractionDigits: 2 })} materials</p>
            </div>
            <div className="flex items-center gap-2">
              <input type="number" inputMode="decimal" min="0" max="50" step="0.5"
                className="bg-accent border border-border rounded px-2 py-1 text-right w-16 text-xs text-foreground outline-none"
                value={handlingRate}
                onChange={e => setHandlingRate(e.target.value === '' ? 0 : Math.max(0, parseFloat(e.target.value)))} />
              <span className="text-[10px] font-mono text-primary w-16 text-right">
                +${materialHandling(pricing.materials_total, handlingFraction).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}
        {showTaxInput || taxRate > 0 ? (
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-muted-foreground font-bold uppercase tracking-widest">Sales Tax (%)</span>
            <div className="flex items-center gap-2">
              <input type="number" inputMode="decimal" className="bg-accent border border-border rounded px-2 py-1 text-right w-16 text-xs text-foreground outline-none"
                value={taxRate} onChange={e => setTaxRate(e.target.value === '' ? 0 : parseFloat(e.target.value))} />
              {taxRate === 0 && (
                <button type="button" onClick={() => setShowTaxInput(false)} className="text-[10px] text-muted-foreground hover:text-foreground">Hide</button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <button type="button" onClick={() => setShowTaxInput(true)} className="text-[10px] text-muted-foreground hover:text-primary font-semibold uppercase tracking-widest">
              + Add sales tax
            </button>
          </div>
        )}
        <div className="flex justify-between items-center text-[11px] pt-1">
          <div className="flex items-center gap-1.5">
            <Palette size={13} className="text-[#d9a441]" />
            <div>
              <span className="text-muted-foreground font-bold uppercase tracking-widest">Custom Paint Match (SW/BM)</span>
              <p className="text-[9px] text-muted-foreground/80">+$150 lab fee · +7–10 days drawdown &amp; signed board approval</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !customMatch;
              setCustomMatch(next);
              if (next) {
                setNotes((prev) =>
                  prev.includes('Custom Paint Match Policy')
                    ? prev
                    : [prev.trim(), CUSTOM_MATCH_DISCLAIMER].filter(Boolean).join('\n\n')
                );
              } else {
                setNotes((prev) => prev.replace(CUSTOM_MATCH_DISCLAIMER, '').replace(/\n{3,}/g, '\n\n').trim());
              }
            }}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
              customMatch
                ? 'bg-[#d9a441]/18 text-[#d9a441] border-[#d9a441]/50'
                : 'bg-accent text-muted-foreground border-border hover:text-foreground'
            }`}
          >
            {customMatch ? 'Added (+$150)' : '+ Add $150'}
          </button>
        </div>
        <div className="flex justify-between items-center text-[11px]">
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

      {/* Solo Craftsman Duration Estimator */}
      <div className="bg-card p-4 rounded-xl border border-border space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Clock size={13} className="text-[#d9a441]" />
            <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              Estimated Duration (Solo Craftsman)
            </label>
          </div>
          <span className="text-[9px] text-muted-foreground/75">Printed on Estimate PDF</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: '2.5–3 days · Vent Hood / Fireplace', value: '2.5–3 days (solo)' },
            { label: '3–5 days · Feature Wall / Room', value: '3–5 days (solo)' },
            { label: '7–10 days · Waterproof Finish', value: '7–10 days (solo, multi-coat & cure)' },
          ].map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => setDurationEstimate(preset.value)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                durationEstimate === preset.value
                  ? 'bg-[#d9a441]/15 text-[#d9a441] border-[#d9a441]/40'
                  : 'bg-accent/60 text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={durationEstimate}
          onChange={(e) => setDurationEstimate(e.target.value)}
          placeholder="e.g. 2.5–3 days, or 7–10 days for waterproof cure..."
          className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:ring-1 focus:ring-primary"
        />
        {hasWaterproofScope && !/7|8|9|10/i.test(durationEstimate) && (
          <p className="text-[10px] text-[#d9a441]">
            Waterproof finish detected — solo jobs typically run 7–10 days including cure stages.
          </p>
        )}
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
