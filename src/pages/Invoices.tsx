import React, { useState } from 'react';
import { Search, Plus, ChevronRight, FileSpreadsheet, CheckCircle, Clock, AlertCircle, Shield } from 'lucide-react';
import { Invoice, Contact } from '@/types';
import { getInvoices, getContacts } from '@/services/storage';
import { LEGAL_TERMS, PRIVACY_NOTICE } from '@/lib/legal';

const Invoices: React.FC = () => {
  const [invoices] = useState<Invoice[]>(getInvoices());
  const [contacts] = useState<Contact[]>(getContacts());
  const [searchTerm, setSearchTerm] = useState('');

  const filteredInvoices = invoices.filter(inv => {
    const contact = contacts.find(c => c.id === inv.contactId);
    return inv.number.toLowerCase().includes(searchTerm.toLowerCase()) || contact?.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const totals = invoices.reduce((acc, inv) => {
    const subtotal = inv.items.reduce((sum, item) => sum + item.amount, 0);
    const total = subtotal * (1 + (inv.taxRate || 0) / 100);
    if (inv.status === 'paid') acc.paid += total;
    else { acc.outstanding += total; acc.unpaidCount += 1; }
    return acc;
  }, { paid: 0, outstanding: 0, unpaidCount: 0 });

  const getStatusInfo = (inv: Invoice) => {
    const isOverdue = inv.status === 'unpaid' && new Date(inv.dueDate) < new Date();
    if (inv.status === 'paid') return { label: 'Paid', classes: 'bg-primary/10 text-primary border-primary/20', icon: <CheckCircle size={10} className="mr-1" /> };
    if (isOverdue) return { label: 'Overdue', classes: 'bg-destructive/10 text-destructive border-destructive/20', icon: <AlertCircle size={10} className="mr-1" /> };
    return { label: 'Pending', classes: 'bg-warning/10 text-warning border-warning/20', icon: <Clock size={10} className="mr-1" /> };
  };

  return (
    <div className="space-y-4 animate-fade-in pb-20 max-w-2xl mx-auto">
      <header>
        <h2 className="text-xl font-serif text-foreground tracking-tight">Invoices</h2>
        <p className="text-muted-foreground text-[9px] uppercase tracking-widest mt-0.5 font-bold">Financial Management</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card p-4 rounded-xl border border-border shadow-soft">
          <div className="flex items-center gap-1.5 mb-2 text-warning">
            <Clock size={14} />
            <span className="text-[9px] font-bold uppercase tracking-widest">Unpaid</span>
          </div>
          <p className="font-serif text-xl text-foreground">${totals.outstanding.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          <p className="text-[9px] text-muted-foreground mt-1 uppercase tracking-widest font-bold">{totals.unpaidCount} Due</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-soft">
          <div className="flex items-center gap-1.5 mb-2 text-primary">
            <CheckCircle size={14} />
            <span className="text-[9px] font-bold uppercase tracking-widest">Paid</span>
          </div>
          <p className="font-serif text-xl text-foreground">${totals.paid.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          <p className="text-[9px] text-muted-foreground mt-1 uppercase tracking-widest font-bold">Processed</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
        <input type="text" placeholder="Search invoices..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-card border border-border rounded-xl py-2 pl-9 pr-4 text-xs text-foreground placeholder-muted-foreground outline-none focus:ring-1 focus:ring-primary" />
      </div>

      <div className="space-y-3">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-10 bg-card rounded-xl border border-dashed border-border">
            <p className="text-muted-foreground text-[11px]">No invoices found.</p>
          </div>
        ) : (
          filteredInvoices.map(inv => {
            const contact = contacts.find(c => c.id === inv.contactId);
            const status = getStatusInfo(inv);
            const total = inv.items.reduce((sum, item) => sum + item.amount, 0) * (1 + (inv.taxRate || 0) / 100);
            return (
              <div key={inv.id} className="group bg-card p-3.5 rounded-xl shadow-soft border border-border hover:border-primary/20 transition-all cursor-pointer">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors border border-border">
                      <FileSpreadsheet size={16} />
                    </div>
                    <div>
                      <span className="font-serif font-bold text-foreground text-sm block leading-none">{inv.number}</span>
                      <span className="text-[10px] text-muted-foreground font-bold tracking-tight mt-0.5 inline-block">{contact?.name || 'Client'}</span>
                    </div>
                  </div>
                  <span className={`text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-widest border flex items-center ${status.classes}`}>
                    {status.icon} {status.label}
                  </span>
                </div>
                <div className="flex justify-between items-end mt-3 pl-11">
                  <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">
                    {inv.status === 'paid' ? 'Paid' : 'Due'}: {new Date(inv.status === 'paid' ? inv.date : inv.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-serif font-bold text-foreground text-base">${total.toLocaleString(undefined, { minimumFractionDigits: 0 })}</p>
                    <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Legal Footer */}
      <div className="bg-card/50 border border-border rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={12} className="text-primary" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Terms & Privacy</span>
        </div>
        <p className="text-[9px] text-muted-foreground leading-relaxed">{LEGAL_TERMS.paymentTerms}</p>
        <p className="text-[9px] text-muted-foreground/60 leading-relaxed italic">{PRIVACY_NOTICE}</p>
      </div>
    </div>
  );
};

export default Invoices;
