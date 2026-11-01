import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Search, Trash2, Shield, UserPlus } from 'lucide-react';
import { QuickContactDialog, QuickProjectDialog } from '@/components/QuickCreateDialogs';

const NEW_PROJECT = '__new_project__';
import { useContacts } from '@/hooks/useContacts';
import { useProjects } from '@/hooks/useProjects';
import { useSaveEstimate, useEstimate } from '@/hooks/useEstimates';
import { useSystems } from '@/hooks/useSystems';
import { computeEstimatePricing } from '@/lib/pricing';
import { CostBreakdown } from '@/components/CostBreakdown';
import { useSettings, renderTerms, depositAmount, pctLabel } from '@/hooks/useSettings';
import { toast } from 'sonner';

interface LineItem {
  id: string;
  scope: string;
  materials: string;
  amount: number;
}

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
  const [systemId, setSystemId] = useState('');
  const [areaSf, setAreaSf] = useState<number>(0);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', scope: '', materials: '', amount: 0 }
  ]);
  const [notes, setNotes] = useState('');
  const [taxRate, setTaxRate] = useState(8.75);
  const [defaultsApplied, setDefaultsApplied] = useState(false);
  // Apply user defaults to new estimates once settings load
  useEffect(() => {
    if (isEdit || defaultsApplied || !settingsLoaded) return;
    setTaxRate(+(Number(settings.default_tax_rate) * 100).toFixed(4));
    setNotes(`${pctLabel(settings.default_deposit_pct)}% deposit required to schedule.`);
    setDefaultsApplied(true);
  }, [isEdit, defaultsApplied, settingsLoaded, settings]);
  const [validUntil, setValidUntil] = useState<string>(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [showTerms, setShowTerms] = useState(false);

  // Hydrate from existing estimate when editing
  useEffect(() => {
    if (!isEdit || !existing) return;
    setSelectedContactId(existing.contact_id || '');
    setSelectedProjectId(existing.project_id || '');
    setSystemId(existing.system_id || '');
    setAreaSf(Number(existing.area_sf || 0));
    const items = Array.isArray(existing.line_items) ? (existing.line_items as any[]) : [];
    if (items.length) {
      setLineItems(items.map((li: any, i) => ({
        id: String(li.id ?? i + 1),
        scope: li.scope ?? li.description ?? '',
        materials: li.materials ?? '',
        amount: Number(li.amount ?? 0),
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

  const updateItem = (index: number, field: keyof LineItem, value: any) => {
    const newItems = [...lineItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setLineItems(newItems);
  };

  const subtotal = useMemo(() => lineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0), [lineItems]);
  const taxFraction = (Number(taxRate) || 0) / 100;
  const selectedSystem = systems.find(s => s.id === systemId) || null;
  const pricing = useMemo(() => computeEstimatePricing({
    system: selectedSystem as any, area_sf: areaSf, settings, extra_direct: subtotal, tax_rate: taxFraction,
  }), [selectedSystem, areaSf, settings, subtotal, taxFraction]);
  const tax = pricing.tax_amount;
  const total = pricing.total;
  const deposit = depositAmount(total, settings.default_deposit_pct);

  const handleSave = async () => {
    if (!selectedContactId) {
      toast.error('Select a client first');
      return;
    }
    if (!systemId && (!lineItems.length || lineItems.every(li => !li.scope && !li.amount))) {
      toast.error('Pick a system and area, or add a line item');
      return;
    }
    if (systemId && !(areaSf > 0)) {
      toast.error('Enter the square footage for this system');
      return;
    }
    try {
      const items = lineItems.filter(li => (Number(li.amount) || 0) !== 0).map(li => ({
        id: li.id,
        description: `${li.scope || ''}${li.materials ? `\nMaterials: ${li.materials}` : ''}`,
        scope: li.scope, materials: li.materials, amount: Number(li.amount) || 0,
      }));
      const saved = await saveEstimate.mutateAsync({
        ...(isEdit && existing ? { id: existing.id } : {}),
        contact_id: selectedContactId,
        project_id: selectedProjectId || null,
        line_items: items as any,
        system_id: systemId || null,
        area_sf: areaSf > 0 ? areaSf : null,
        subtotal: pricing.pre_tax_total,
        tax_rate: taxFraction,
        direct_cost_subtotal: pricing.direct_cost_subtotal,
        overhead_amount: pricing.overhead_amount,
        profit_amount: pricing.profit_amount,
        pre_tax_total: pricing.pre_tax_total,
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
  }, [step, selectedContactId, lineItems, systemId, areaSf, pricing, taxRate, validUntil, notes, selectedProjectId, saveEstimate.isPending]);

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

      <div className="bg-card p-3 rounded-xl border border-border space-y-2">
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">System & Area</p>
        <div className="flex gap-2">
          <select value={systemId} onChange={e => setSystemId(e.target.value)}
            className="flex-1 bg-accent border border-border rounded-lg p-2 text-foreground text-xs outline-none">
            <option value="">No system (line items only)</option>
            {systems.filter(s => s.is_active !== false || s.id === systemId).map(s => (
              <option key={s.id} value={s.id}>{s.name}{s.manufacturer ? ` — ${s.manufacturer}` : ''}</option>
            ))}
          </select>
          <input type="number" inputMode="decimal" min="0" placeholder="SF"
            className="w-24 bg-accent border border-border rounded-lg p-2 text-right text-foreground text-xs outline-none"
            value={areaSf || ''} onChange={e => setAreaSf(e.target.value === '' ? 0 : parseFloat(e.target.value))} />
        </div>
        {selectedSystem && !(Number(selectedSystem.coverage_rate) > 0 && Number(selectedSystem.cost_per_unit) >= 0 && selectedSystem.labor_rate_per_sf != null) && (
          <p className="text-[10px] text-warning">This system is missing coverage, cost per unit or labor rate — fill them in on the Systems page for accurate pricing.</p>
        )}
        <p className="text-[10px] text-muted-foreground">Line items below are added as extra direct costs before overhead and profit.</p>
      </div>

      <div className="space-y-3">
        {lineItems.map((item, index) => (
          <div key={item.id} className="bg-card p-3 rounded-xl border border-border">
            <textarea placeholder="Scope of Work..." className="w-full bg-accent border border-border rounded-lg p-2 text-foreground text-[11px] mb-1.5 outline-none resize-none h-12"
              value={item.scope} onChange={e => updateItem(index, 'scope', e.target.value)} />
            <div className="flex gap-2 items-center">
              <input placeholder="Materials..." className="flex-1 bg-accent border border-border rounded-lg p-2 text-foreground text-[11px] outline-none"
                value={item.materials} onChange={e => updateItem(index, 'materials', e.target.value)} />
              <span className="text-muted-foreground text-[10px]">$</span>
              <input type="number" inputMode="decimal" className="bg-accent border border-border rounded-lg p-1.5 text-right text-primary font-mono text-xs w-20 outline-none"
                value={Number.isFinite(item.amount) ? item.amount : 0}
                onChange={e => updateItem(index, 'amount', e.target.value === '' ? 0 : parseFloat(e.target.value))} />
              <button onClick={() => setLineItems(lineItems.filter((_, i) => i !== index))} className="text-destructive p-1.5"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        <button onClick={() => setLineItems([...lineItems, { id: Date.now().toString(), scope: '', materials: '', amount: 0 }])}
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
        <div className="flex justify-between text-lg font-serif text-primary pt-2 border-t border-border">
          <span className="text-sm">Estimate Total</span>
          <span className="text-base">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{pctLabel(settings.default_deposit_pct)}% Deposit</span>
          <span>${deposit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      <CostBreakdown b={pricing} systemName={selectedSystem?.name} />

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
