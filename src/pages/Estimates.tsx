import React, { useState, useRef } from 'react';
import { Plus, Search, ChevronLeft, Trash2, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Contact, Estimate, LineItem } from '@/types';
import { getContacts, getEstimates, saveEstimate, saveInvoice } from '@/services/storage';

const Estimates: React.FC = () => {
  const navigate = useNavigate();
  const [contacts] = useState<Contact[]>(getContacts());
  const [estimates, setEstimates] = useState<Estimate[]>(getEstimates());
  const [view, setView] = useState<'list' | 'select-client' | 'create'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [notes, setNotes] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [estimateNumber, setEstimateNumber] = useState('');

  const refresh = () => setEstimates(getEstimates());

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

  const totals = calculateTotals(lineItems, taxRate);
  const selectedContact = contacts.find(c => c.id === selectedContactId);

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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredContacts.map(contact => (
            <button key={contact.id} onClick={() => { setSelectedContactId(contact.id); setView('create'); }}
              className="p-4 bg-card border border-border rounded-xl hover:border-primary/50 text-left transition-all">
              <h3 className="font-bold text-foreground text-sm">{contact.name}</h3>
              <p className="text-[10px] text-muted-foreground">{contact.email}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

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
      </div>
    );
  }

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

      <div className="space-y-3">
        {filteredEstimates.length === 0 ? (
          <div className="text-center py-10 bg-card rounded-xl border border-dashed border-border">
            <p className="text-muted-foreground text-[11px]">No estimates found.</p>
          </div>
        ) : (
          filteredEstimates.map(e => (
            <div key={e.id} className="bg-card p-4 rounded-xl border border-border flex justify-between items-center hover:border-primary/20 transition-all cursor-pointer group">
              <div>
                <h3 className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">{e.number}</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">{contacts.find(c => c.id === e.contactId)?.name} • {new Date(e.date).toLocaleDateString()}</p>
              </div>
              <span className="px-2 py-0.5 bg-accent text-foreground text-[8px] rounded uppercase font-bold tracking-widest border border-border">{e.status}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Estimates;
