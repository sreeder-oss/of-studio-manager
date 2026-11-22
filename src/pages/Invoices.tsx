import { parseLocalDate, todayLocal, daysFromTodayLocal } from '@/lib/utils';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, FileSpreadsheet, CheckCircle, Clock, AlertCircle, Shield } from 'lucide-react';
import { useInvoices } from '@/hooks/useInvoices';
import { useContacts } from '@/hooks/useContacts';
import { PRIVACY_NOTICE } from '@/lib/legal';
import { useSettings, renderTerms } from '@/hooks/useSettings';

const Invoices: React.FC = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { data: invoices = [], isLoading } = useInvoices();
  const { data: contacts = [] } = useContacts();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredInvoices = invoices.filter(inv => {
    const contact = contacts.find(c => c.id === inv.contact_id);
    return (contact?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  const totals = invoices.reduce((acc, inv) => {
    if (inv.status === 'paid') acc.paid += Number(inv.total || 0);
    else {
      acc.paid += Number(inv.amount_paid || 0) + Number(inv.deposit_applied || 0);
      acc.outstanding += Number(inv.balance_due ?? inv.total ?? 0);
      acc.unpaidCount += 1;
    }
    return acc;
  }, { paid: 0, outstanding: 0, unpaidCount: 0 });

  const getStatusInfo = (inv: typeof invoices[0]) => {
    const isOverdue = inv.status === 'overdue' || (inv.status !== 'paid' && inv.due_date && inv.due_date.slice(0, 10) < todayLocal());
    if (inv.status === 'paid') return { label: 'Paid', classes: 'bg-primary/10 text-primary border-primary/20', icon: <CheckCircle size={10} className="mr-1" /> };
    if (inv.status === 'partial' && !isOverdue) return { label: 'Partial', classes: 'bg-warning/10 text-warning border-warning/20', icon: <Clock size={10} className="mr-1" /> };
    if (isOverdue) return { label: 'Overdue', classes: 'bg-destructive/10 text-destructive border-destructive/20', icon: <AlertCircle size={10} className="mr-1" /> };
    return { label: 'Pending', classes: 'bg-warning/10 text-warning border-warning/20', icon: <Clock size={10} className="mr-1" /> };
  };

  if (isLoading) return <div className="text-center py-20 text-muted-foreground text-sm">Loading invoices...</div>;

  return (
    <div className="space-y-4 animate-fade-in pb-20 max-w-5xl mx-auto">
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
            <p className="text-muted-foreground text-[11px]">No invoices yet.</p>
          </div>
        ) : (
          filteredInvoices.map(inv => {
            const contact = contacts.find(c => c.id === inv.contact_id);
            const status = getStatusInfo(inv);
            const total = Number(inv.total || 0);
            return (
              <div key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)}
                className="group bg-card p-3.5 rounded-xl shadow-soft border border-border hover:border-primary/20 transition-all cursor-pointer">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors border border-border">
                      <FileSpreadsheet size={16} />
                    </div>
                    <div>
                      <span className="font-serif font-bold text-foreground text-sm block leading-none">{contact?.name || 'Client'}</span>
                      {inv.invoice_number && <span className="text-[10px] text-primary font-bold tracking-widest mr-2">{inv.invoice_number}</span>}
                      <span className="text-[10px] text-muted-foreground font-bold tracking-tight mt-0.5 inline-block">
                        {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                  </div>
                  <span className={`text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-widest border flex items-center ${status.classes}`}>
                    {status.icon} {status.label}
                  </span>
                </div>
                <div className="flex justify-between items-end mt-3 pl-11">
                  <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">
                    {inv.paid ? 'Paid' : 'Due'}: {inv.due_date ? parseLocalDate(inv.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'N/A'}
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

      <div className="bg-card/50 border border-border rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={12} className="text-primary" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Terms & Privacy</span>
        </div>
        {renderTerms(settings).map((t, i) => <p key={i} className="text-[9px] text-muted-foreground leading-relaxed">{t}</p>)}
        <p className="text-[9px] text-muted-foreground/60 leading-relaxed italic">{PRIVACY_NOTICE}</p>
      </div>
    </div>
  );
};

export default Invoices;
