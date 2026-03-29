import React, { useState, useRef } from 'react';
import { Plus, Search, ChevronLeft, Trash2, Shield, ChevronRight, FileText, CheckCircle, Clock, Send } from 'lucide-react';
import { Contact, Estimate, LineItem } from '@/types';
import { getContacts, getEstimates, saveEstimate, deleteEstimate } from '@/services/storage';
import { LEGAL_TERMS, COMPANY_INFO } from '@/lib/legal';

const Estimates: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>(getContacts());
  const [estimates, setEstimates] = useState<Estimate[]>(getEstimates());
  const [view, setView] = useState<'list' | 'select-client' | 'create' | 'detail'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [notes, setNotes] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [estimateNumber, setEstimateNumber] = useState('');
  const [showTerms, setShowTerms] = useState(false);
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null);

  const refresh = () => { setEstimates(getEstimates()); setContacts(getContacts()); };

  const filteredEstimates = estimates.filter(e => {
    const contact = contacts.find(c => c.id === e.contactId);
    return `${e.number} ${contact?.name || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) || c.email.toLowerCase().includes(clientSearchTerm.toLowerCase())
  );

  const calculateTotals = (items: LineItem[], rate = 0) => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const tax = subtotal * (rate / 100);
    const total = subtotal + tax;
    const deposit = total * 0.5;
    return { subtotal, tax, total, deposit };
  };

  const updateItem = (index: number, field: keyof LineItem, value: any) => {
    const newItems = [...lineItems];
    const item = { ...newItems[index], [field]: value };
    if (field === 'scope' || field === 'materials') {
      item.description = `${item.scope || ''}${item.materials ? `\nMaterials: ${item.materials}` : ''}`;
    }
    newItems[index] = item;
    setLineItems(newItems);
  };

  const startNewEstimate = () => {
    setLineItems([{ id: '1', description: '', scope: '', materials: '', amount: 0 }]);
    setNotes('50% deposit required to schedule.');
    setTaxRate(0);
    setEstimateNumber(`EST-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`);
    setView('select-client');
  };

  const handleSave = () => {
    if (!selectedContactId || lineItems.length === 0) return;
    saveEstimate({
      id: `e-${Date.now()}`, contactId: selectedContactId, number: estimateNumber,
      items: lineItems, notes, status: 'pending', date: new Date().toISOString().split('T')[0], taxRate
    });
    refresh();
    setView('list');
  };

  const handleDeleteEstimate = (id: string) => {
    if (confirm('Delete this estimate?')) {
      deleteEstimate(id);
      refresh();
      setView('list');
    }
  };

  const openDetail = (estimate: Estimate) => {
    setSelectedEstimate(estimate);
    setView('detail');
  };

  const getStatusInfo = (status: string) => {
    if (status === 'approved') return { label: 'Approved', classes: 'bg-primary/10 text-primary border-primary/20', icon: <CheckCircle size={10} className="mr-1" /> };
    if (status === 'sent') return { label: 'Sent', classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: <Send size={10} className="mr-1" /> };
    return { label: 'Pending', classes: 'bg-warning/10 text-warning border-warning/20', icon: <Clock size={10} className="mr-1" /> };
  };

  const totals = calculateTotals(lineItems, taxRate);
  const selectedContact = contacts.find(c => c.id === selectedContactId);

  // Detail View
  if (view === 'detail' && selectedEstimate) {
    const contact = contacts.find(c => c.id === selectedEstimate.contactId);
    const t = calculateTotals(selectedEstimate.items, selectedEstimate.taxRate);
    const status = getStatusInfo(selectedEstimate.status);

    return (
      <div className="space-y-4 animate-fade-in pb-20 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <button onClick={() => setView('list')} className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-[10px] font-bold uppercase tracking-widest">
            <ChevronLeft size={14} /> All Estimates
          </button>
          <button onClick={() => handleDeleteEstimate(selectedEstimate.id)} className="text-[10px] text-destructive/60 hover:text-destructive font-bold uppercase tracking-widest">
            Delete
          </button>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="font-serif text-foreground text-xl">{selectedEstimate.number}</h2>
              <p className="text-muted-foreground text-xs mt-0.5">{contact?.name || 'Unknown Client'}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {new Date(selectedEstimate.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <span className={`text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-widest border flex items-center ${status.classes}`}>
              {status.icon} {status.label}
            </span>
          </div>

          {contact && (
            <div className="bg-accent rounded-xl p-3 mb-4 border border-border">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Client</p>
              <p className="text-foreground text-sm font-semibold">{contact.name}</p>
              {contact.email && <p className="text-muted-foreground text-[11px]">{contact.email}</p>}
              {contact.phone && <p className="text-muted-foreground text-[11px]">{contact.phone}</p>}
              {contact.address && <p className="text-muted-foreground text-[11px]">{contact.address}</p>}
            </div>
          )}

          <div className="space-y-2 mb-4">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Line Items</p>
            {selectedEstimate.items.map((item, i) => (
              <div key={item.id} className="bg-accent rounded-xl p-3 border border-border">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    {item.scope && <p className="text-foreground text-sm font-semibold">{item.scope}</p>}
                    {item.materials && <p className="text-muted-foreground text-[11px] mt-0.5">Materials: {item.materials}</p>}
                    {!item.scope && <p className="text-foreground text-sm">{item.description}</p>}
                  </div>
                  <p className="font-serif text-foreground font-bold ml-4">${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-3 space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtotal</span>
              <span>${t.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            {(selectedEstimate.taxRate || 0) > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Tax ({selectedEstimate.taxRate}%)</span>
                <span>${t.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-serif text-primary pt-1">
              <span className="text-sm">Total</span>
              <span className="text-base font-bold">${t.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>50% Deposit</span>
              <span>${t.deposit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {selectedEstimate.notes && (
            <div className="mt-4 pt-3 border-t border-border">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Notes</p>
              <p className="text-foreground text-sm">{selectedEstimate.notes}</p>
            </div>
          )}
        </div>

        <div className="bg-card/50 border border-border rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={12} className="text-primary" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Terms & Conditions</span>
          </div>
          {Object.entries(LEGAL_TERMS).map(([key, text]) => (
            <p key={key} className="text-[9px] text-muted-foreground leading-relaxed">{text}</p>
          ))}
        </div>
      </div>
    );
  }

  // Select Client View
  if (view === 'select-client') {
    return (
      <div className="space-y-4 animate-fade-in max-w-2xl mx-auto">
        <div className="flex items-center gap-4">
          <button onClick={() => setView('list')} className="p-1.5 hover:bg-accent rounded-full text-muted-foreground"><ChevronLeft size={20} /></button>
          <h2 className="text-xl font-serif text-foreground">Select Client</h2>
        </div>
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
              <button key={contact.id} onClick={() => { setSelectedContactId(contact.id); setView('create'); }}
                className="p-4 bg-card border border-border rounded-xl hover:border-primary/50 text-left transition-all">
                <h3 className="font-bold text-foreground text-sm">{contact.name}</h3>
                <p className="text-[10px] text-muted-foreground">{contact.email}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Create Estimate View
  if (view === 'create') {
    return (
      <div className="animate-fade-in max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setView('select-client')} className="p-1.5 hover:bg-accent rounded-full text-muted-foreground"><ChevronLeft size={18} /></button>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{estimateNumber}</p>
            <p className="text-xs text-foreground">{selectedContact?.name}</p>
          </div>
          <button onClick={handleSave} className="bg-primary text-primary-foreground px-4 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-glow">Save</button>
        </div>

        {/* Line Items */}
        <div className="space-y-3">
          {lineItems.map((item, index) => (
            <div key={item.id} className="bg-card p-3 rounded-xl border border-border">
              <textarea placeholder="Scope of Work..." className="w-full bg-accent border border-border rounded-lg p-2 text-foreground text-[11px] mb-1.5 outline-none resize-none h-12"
                value={item.scope || ''} onChange={e => updateItem(index, 'scope', e.target.value)} />
              <div className="flex gap-2 items-center">
                <input placeholder="Materials..." className="flex-1 bg-accent border border-border rounded-lg p-2 text-foreground text-[11px] outline-none"
                  value={item.materials || ''} onChange={e => updateItem(index, 'materials', e.target.value)} />
                <span className="text-muted-foreground text-[10px]">$</span>
                <input type="number" className="bg-accent border border-border rounded-lg p-1.5 text-right text-primary font-mono text-xs w-20 outline-none"
                  value={item.amount} onChange={e => updateItem(index, 'amount', parseFloat(e.target.value) || 0)} />
                <button onClick={() => setLineItems(lineItems.filter((_, i) => i !== index))} className="text-destructive p-1.5"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          <button onClick={() => setLineItems([...lineItems, { id: Date.now().toString(), description: '', scope: '', materials: '', amount: 0 }])}
            className="w-full py-2 border border-dashed border-border text-muted-foreground rounded-xl hover:text-foreground text-[10px] uppercase tracking-widest font-bold">+ Add Line Item</button>
        </div>

        {/* Totals */}
        <div className="bg-card p-4 rounded-xl space-y-2 border border-border">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-muted-foreground font-bold uppercase tracking-widest">Tax (%)</span>
            <input type="number" className="bg-accent border border-border rounded px-2 py-1 text-right w-12 text-xs text-foreground outline-none"
              value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} />
          </div>
          <div className="flex justify-between text-lg font-serif text-primary pt-2 border-t border-border">
            <span className="text-sm">Estimate Total</span>
            <span className="text-base">${totals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>50% Deposit</span>
            <span>${totals.deposit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            className="w-full bg-card border border-border rounded-xl p-3 text-foreground text-[11px] outline-none resize-none h-16 focus:ring-1 focus:ring-primary" />
        </div>

        {/* Legal Terms */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <button onClick={() => setShowTerms(!showTerms)}
            className="w-full flex items-center justify-between p-3 text-left">
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
  }

  // Estimate List View
  return (
    <div className="space-y-4 animate-fade-in max-w-2xl mx-auto">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-serif text-foreground tracking-tight">Estimates</h2>
          <p className="text-muted-foreground text-[9px] uppercase tracking-widest mt-0.5 font-bold">Project Proposals</p>
        </div>
        <button onClick={startNewEstimate} className="bg-primary text-primary-foreground px-5 py-2 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-glow">
          New Quote
        </button>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <input type="text" placeholder="Search estimates..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-card border border-border rounded-xl py-2.5 pl-12 pr-4 text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground text-[12px]" />
      </div>

      <div className="space-y-3">
        {filteredEstimates.length === 0 ? (
          <div className="text-center py-10 bg-card rounded-xl border border-dashed border-border">
            <p className="text-muted-foreground text-[11px]">No estimates yet. Tap "New Quote" to create one.</p>
          </div>
        ) : (
          filteredEstimates.map(e => {
            const t = calculateTotals(e.items, e.taxRate);
            const status = getStatusInfo(e.status);
            return (
              <div key={e.id} onClick={() => openDetail(e)}
                className="bg-card p-4 rounded-xl border border-border flex justify-between items-center hover:border-primary/20 transition-all cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors border border-border">
                    <FileText size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">{e.number}</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{contacts.find(c => c.id === e.contactId)?.name || 'Unknown'} • {new Date(e.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-serif text-foreground text-sm">${t.total.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                    <span className={`text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-widest border flex items-center ${status.classes}`}>
                      {status.icon} {status.label}
                    </span>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Estimates;
