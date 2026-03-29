import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Shield, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Invoice, Contact } from '@/types';
import { getInvoices, getContacts, saveInvoice } from '@/services/storage';
import { LEGAL_TERMS, PRIVACY_NOTICE } from '@/lib/legal';

const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contacts] = useState<Contact[]>(getContacts());
  const [invoice, setInvoice] = useState<Invoice | null>(() => getInvoices().find(i => i.id === id) || null);

  if (!invoice) {
    return (
      <div className="text-center py-20 max-w-2xl mx-auto">
        <p className="text-muted-foreground text-sm">Invoice not found.</p>
        <button onClick={() => navigate('/invoices')} className="text-primary text-xs mt-2 hover:underline">Back to Invoices</button>
      </div>
    );
  }

  const contact = contacts.find(c => c.id === invoice.contactId);
  const subtotal = invoice.items.reduce((sum, item) => sum + item.amount, 0);
  const tax = subtotal * ((invoice.taxRate || 0) / 100);
  const total = subtotal + tax;

  const getStatusInfo = (inv: Invoice) => {
    const isOverdue = inv.status === 'unpaid' && new Date(inv.dueDate) < new Date();
    if (inv.status === 'paid') return { label: 'Paid', classes: 'bg-primary/10 text-primary border-primary/20', icon: <CheckCircle size={10} className="mr-1" /> };
    if (isOverdue) return { label: 'Overdue', classes: 'bg-destructive/10 text-destructive border-destructive/20', icon: <AlertCircle size={10} className="mr-1" /> };
    return { label: 'Pending', classes: 'bg-warning/10 text-warning border-warning/20', icon: <Clock size={10} className="mr-1" /> };
  };

  const status = getStatusInfo(invoice);

  const togglePaid = () => {
    const updated = { ...invoice, status: invoice.status === 'paid' ? 'unpaid' as const : 'paid' as const };
    saveInvoice(updated);
    setInvoice(updated);
  };

  const handleDelete = () => {
    if (confirm('Delete this invoice?')) {
      const remaining = getInvoices().filter(i => i.id !== invoice.id);
      localStorage.setItem('of_invoices', JSON.stringify(remaining));
      navigate('/invoices');
    }
  };

  return (
    <div className="space-y-4 animate-fade-in pb-20 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/invoices')} className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-[10px] font-bold uppercase tracking-widest">
          <ChevronLeft size={14} /> All Invoices
        </button>
        <button onClick={handleDelete} className="text-[10px] text-destructive/60 hover:text-destructive font-bold uppercase tracking-widest">
          Delete
        </button>
      </div>

      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="font-serif text-foreground text-xl">{invoice.number}</h2>
            <p className="text-muted-foreground text-xs mt-0.5">{contact?.name || 'Unknown Client'}</p>
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
          </div>
        )}

        <div className="flex gap-4 mb-4">
          <div className="bg-accent rounded-xl p-3 flex-1 border border-border">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Issued</p>
            <p className="text-foreground text-sm mt-0.5">{new Date(invoice.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
          <div className="bg-accent rounded-xl p-3 flex-1 border border-border">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Due</p>
            <p className="text-foreground text-sm mt-0.5">{new Date(invoice.dueDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Line Items</p>
          {invoice.items.map(item => (
            <div key={item.id} className="bg-accent rounded-xl p-3 border border-border flex justify-between items-center">
              <p className="text-foreground text-sm">{item.description}</p>
              <p className="font-serif text-foreground font-bold ml-4">${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-3 space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Subtotal</span>
            <span>${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          {(invoice.taxRate || 0) > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Tax ({invoice.taxRate}%)</span>
              <span>${tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-serif text-primary pt-1">
            <span className="text-sm">Total</span>
            <span className="text-base font-bold">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border">
          <button onClick={togglePaid}
            className={`w-full py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${
              invoice.status === 'paid'
                ? 'bg-muted text-muted-foreground border border-border hover:bg-destructive/10 hover:text-destructive'
                : 'bg-primary text-primary-foreground shadow-glow'
            }`}>
            {invoice.status === 'paid' ? 'Mark as Unpaid' : 'Mark as Paid'}
          </button>
        </div>
      </div>

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

export default InvoiceDetail;
