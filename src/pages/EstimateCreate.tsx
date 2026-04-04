import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, Trash2, Shield } from 'lucide-react';
import { useContacts } from '@/hooks/useContacts';
import { useProjects } from '@/hooks/useProjects';
import { useSaveEstimate } from '@/hooks/useEstimates';
import { LEGAL_TERMS, COMPANY_INFO } from '@/lib/legal';
import { toast } from 'sonner';

interface LineItem {
  id: string;
  scope: string;
  materials: string;
  amount: number;
}

const EstimateCreate: React.FC = () => {
  const navigate = useNavigate();
  const { data: contacts = [] } = useContacts();
  const { data: projects = [] } = useProjects();
  const saveEstimate = useSaveEstimate();
  const [step, setStep] = useState<'select-client' | 'create'>('select-client');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', scope: '', materials: '', amount: 0 }
  ]);
  const [notes, setNotes] = useState('50% deposit required to schedule.');
  const [taxRate, setTaxRate] = useState(8.75);
  const [showTerms, setShowTerms] = useState(false);

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) || (c.email || '').toLowerCase().includes(clientSearchTerm.toLowerCase())
  );

  const selectedContact = contacts.find(c => c.id === selectedContactId);

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    if (projectId) {
      const project = projects.find(p => p.id === projectId);
      if (project?.contact_id) {
        setSelectedContactId(project.contact_id);
      }
    }
  };

  const updateItem = (index: number, field: keyof LineItem, value: any) => {
    const newItems = [...lineItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setLineItems(newItems);
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;
  const deposit = total * 0.5;

  const handleSave = async () => {
    if (!selectedContactId || lineItems.length === 0) return;
    try {
      const items = lineItems.map(li => ({
        id: li.id,
        description: `${li.scope || ''}${li.materials ? `\nMaterials: ${li.materials}` : ''}`,
        scope: li.scope, materials: li.materials, amount: li.amount,
      }));
      await saveEstimate.mutateAsync({
        contact_id: selectedContactId,
        project_id: selectedProjectId || undefined,
        line_items: items as any,
        subtotal, tax_rate: taxRate / 100, total,
        status: 'Pending',
        valid_until: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      });
      toast.success('Estimate saved');
      navigate('/estimates');
    } catch { toast.error('Failed to save estimate'); }
  };

  if (step === 'select-client') {
    return (
      <div className="space-y-4 animate-fade-in max-w-2xl mx-auto">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/estimates')} className="p-1.5 hover:bg-accent rounded-full text-muted-foreground"><ChevronLeft size={20} /></button>
          <h2 className="text-xl font-serif text-foreground">New Estimate</h2>
        </div>

        {/* Project picker first */}
        <div>
          <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Project (optional)</label>
          <select value={selectedProjectId} onChange={e => handleProjectChange(e.target.value)}
            className="w-full bg-card border border-border rounded-xl py-2.5 px-4 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary">
            <option value="">No Project</option>
            {projects.filter(p => p.status === 'Active' || p.status === 'Bidding').map(p => (
              <option key={p.id} value={p.id}>{p.name}{contacts.find(c => c.id === p.contact_id) ? ` — ${contacts.find(c => c.id === p.contact_id)!.name}` : ''}</option>
            ))}
          </select>
        </div>

        {/* If project selected with a contact, skip client selection */}
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
              <div className="text-center py-10 bg-card rounded-xl border border-dashed border-border">
                <p className="text-muted-foreground text-[11px]">No contacts yet. Add a contact first.</p>
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
        <button onClick={() => setStep('select-client')} className="p-1.5 hover:bg-accent rounded-full text-muted-foreground"><ChevronLeft size={18} /></button>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">New Estimate</p>
          <p className="text-xs text-foreground">{selectedContact?.name}</p>
          {selectedProjectId && <p className="text-[9px] text-primary">{projects.find(p => p.id === selectedProjectId)?.name}</p>}
        </div>
        <button onClick={handleSave} disabled={saveEstimate.isPending}
          className="bg-primary text-primary-foreground px-4 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-glow disabled:opacity-50">
          {saveEstimate.isPending ? 'Saving...' : 'Save'}
        </button>
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
              <input type="number" className="bg-accent border border-border rounded-lg p-1.5 text-right text-primary font-mono text-xs w-20 outline-none"
                value={item.amount} onChange={e => updateItem(index, 'amount', parseFloat(e.target.value) || 0)} />
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
          <input type="number" className="bg-accent border border-border rounded px-2 py-1 text-right w-16 text-xs text-foreground outline-none"
            value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} />
        </div>
        <div className="flex justify-between text-lg font-serif text-primary pt-2 border-t border-border">
          <span className="text-sm">Estimate Total</span>
          <span className="text-base">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>50% Deposit</span>
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
            {Object.entries(LEGAL_TERMS).map(([key, text]) => (
              <p key={key} className="text-[10px] text-muted-foreground leading-relaxed">{text}</p>
            ))}
            <p className="text-[9px] text-muted-foreground/60 italic pt-1 border-t border-border">
              These terms are automatically included on all estimates generated by {COMPANY_INFO.name}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EstimateCreate;
