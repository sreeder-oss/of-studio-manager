import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Shield, CheckCircle, Clock, AlertCircle, FileDown, Trash2 } from 'lucide-react';
import { useInvoice, useDeleteInvoice } from '@/hooks/useInvoices';
import { useInvoicePayments, useAddInvoicePayment, useDeleteInvoicePayment, localToday, PAYMENT_METHODS, type PaymentMethod } from '@/hooks/useInvoicePayments';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useContact } from '@/hooks/useContacts';
import { useAIPageContext } from '@/hooks/useAIPageContext';
import { PRIVACY_NOTICE } from '@/lib/legal';
import { useSettings, renderTerms } from '@/hooks/useSettings';
import { downloadInvoicePdf, coerceToInvoiceDoc } from '@/lib/invoicePdf';
import { toast } from 'sonner';
import { useProjects } from '@/hooks/useProjects';
import { useChangeOrders, useAddChangeOrdersToInvoice } from '@/hooks/useChangeOrders';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { data: invoice, isLoading } = useInvoice(id!);
  const { data: contact } = useContact(invoice?.contact_id || '');
  const deleteInvoice = useDeleteInvoice();
  const queryClient = useQueryClient();
  const { data: projects = [] } = useProjects();
  const [savingProject, setSavingProject] = React.useState(false);
  const { data: projectCOs = [] } = useChangeOrders(invoice?.project_id);
  const addCOs = useAddChangeOrdersToInvoice();
  const pendingCOs = projectCOs.filter(c => c.status === 'Approved' && !c.invoice_id);
  const pendingCOTotal = Math.round(pendingCOs.reduce((s, c) => s + Number(c.amount || 0), 0) * 100) / 100;
  const { data: payments = [] } = useInvoicePayments(id!);
  const addPayment = useAddInvoicePayment();
  const deletePayment = useDeleteInvoicePayment();
  const [payAmount, setPayAmount] = React.useState('');
  const [payDate, setPayDate] = React.useState(localToday());
  const [payMethod, setPayMethod] = React.useState<PaymentMethod | ''>('');
  const [payRef, setPayRef] = React.useState('');
  const [toDelete, setToDelete] = React.useState<string | null>(null);
  const amountRef = React.useRef<HTMLInputElement>(null);

  const recordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    const amount = parseFloat(payAmount);
    if (!(amount > 0)) { toast.error('Enter a payment amount'); return; }
    if (!payMethod) { toast.error('Choose Check or Zelle'); return; }
    if (!payDate) { toast.error('Enter the payment date'); return; }
    try {
      const s = await addPayment.mutateAsync({ invoice_id: invoice.id, amount, paid_on: payDate, method: payMethod, reference: payRef.trim() });
      setPayAmount(''); setPayRef(''); setPayMethod(''); setPayDate(localToday());
      toast.success(s.status === 'paid' ? 'Paid in full' : 'Payment recorded');
    } catch { /* global toast */ }
  };

  const confirmDeletePayment = async () => {
    if (!invoice || !toDelete) return;
    try {
      await deletePayment.mutateAsync({ id: toDelete, invoice_id: invoice.id });
      toast.success('Payment deleted');
    } catch { /* global toast */ }
    setToDelete(null);
  };

  const handleDelete = async () => {
    if (!invoice) return;
    if (confirm('Delete this invoice? This cannot be undone.')) {
      try {
        await deleteInvoice.mutateAsync(invoice.id);
        toast.success('Invoice deleted');
        navigate('/invoices');
      } catch { toast.error('Failed to delete invoice'); }
    }
  };

  useAIPageContext(invoice ? {
    kind: 'invoice', id: invoice.id,
    total: Number(invoice.total ?? 0),
    paid: invoice.paid, due_date: invoice.due_date,
  } : null);

  if (isLoading) return <div className="text-center py-20 text-muted-foreground text-sm">Loading...</div>;

  if (!invoice) {
    return (
      <div className="text-center py-20 max-w-2xl mx-auto">
        <p className="text-muted-foreground text-sm">Invoice not found.</p>
        <button onClick={() => navigate('/invoices')} className="text-primary text-xs mt-2 hover:underline">Back to Invoices</button>
      </div>
    );
  }

  const items = Array.isArray(invoice.line_items) ? invoice.line_items as any[] : [];
  const subtotal = Number(invoice.subtotal || 0);
  const taxApplied = Number(invoice.tax_applied || 0);
  const total = Number(invoice.total || 0);

  const getStatusInfo = () => {
    const isOverdue = invoice.status === 'overdue' || (invoice.status !== 'paid' && invoice.due_date && new Date(invoice.due_date) < new Date());
    if (invoice.status === 'partial' && !isOverdue) return { label: 'Partial', classes: 'bg-warning/10 text-warning border-warning/20', icon: <Clock size={10} className="mr-1" /> };
    if (invoice.status === 'paid') return { label: 'Paid', classes: 'bg-primary/10 text-primary border-primary/20', icon: <CheckCircle size={10} className="mr-1" /> };
    if (isOverdue) return { label: 'Overdue', classes: 'bg-destructive/10 text-destructive border-destructive/20', icon: <AlertCircle size={10} className="mr-1" /> };
    return { label: 'Pending', classes: 'bg-warning/10 text-warning border-warning/20', icon: <Clock size={10} className="mr-1" /> };
  };

  const status = getStatusInfo();

  const handleDownload = () => {
    try {
      const doc = coerceToInvoiceDoc(invoice.line_items, {
        invoice_number: invoice.invoice_number || '',
        title: contact?.name ? `Invoice — ${contact.name}` : 'Invoice',
        client_name: contact?.name || '',
        project_address: contact?.address || '',
        invoice_date: invoice.created_at?.split('T')[0] || '',
        due_date: invoice.due_date || '',
        subtotal: subtotal,
        tax_applied: taxApplied,
        total: total,
        paid: !!invoice.paid,
        paid_date: invoice.paid_date,
        deposit_applied: Number(invoice.deposit_applied || 0),
        payments: [...payments].sort((a, b) => a.paid_on.localeCompare(b.paid_on))
          .map(p => ({ date: p.paid_on, method: p.method, reference: p.reference, amount: Number(p.amount) })),
      });
      if (!doc) { toast.error('Nothing to export'); return; }
      downloadInvoicePdf(doc, { payee: { payee_name: settings.payee_name, zelle_contact: settings.zelle_contact } });
      toast.success('PDF downloaded');
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate PDF');
    }
  };

  const balance = Number(invoice.balance_due ?? total);
  const fillRemaining = () => {
    setPayAmount(balance > 0 ? balance.toFixed(2) : '');
    setTimeout(() => amountRef.current?.focus(), 0);
  };
  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-4 animate-fade-in pb-20 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/invoices')} className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-[10px] font-bold uppercase tracking-widest">
          <ChevronLeft size={14} /> All Invoices
        </button>
        <button onClick={handleDelete} disabled={deleteInvoice.isPending}
          className="flex items-center gap-1 text-destructive/60 hover:text-destructive text-[10px] font-bold uppercase tracking-widest disabled:opacity-50">
          <Trash2 size={12} /> Delete
        </button>
      </div>

      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="font-serif text-foreground text-xl">Invoice{invoice.invoice_number ? ` ${invoice.invoice_number}` : ''}</h2>
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

        <div className="mb-4">
          <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Project</label>
          <select value={invoice.project_id || ''} disabled={savingProject} aria-label="Project"
            onChange={async (e) => {
              setSavingProject(true);
              const { error } = await supabase.from('invoices').update({ project_id: e.target.value || null }).eq('id', invoice.id);
              setSavingProject(false);
              if (error) { toast.error('Failed to update project'); return; }
              queryClient.invalidateQueries({ queryKey: ['invoices'] });
              toast.success('Project updated');
            }}
            className="mt-1 w-full bg-accent border border-border rounded-xl py-2 px-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary disabled:opacity-50">
            <option value="">No project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {invoice.project_id && pendingCOs.length > 0 && (
          <button disabled={addCOs.isPending}
            onClick={async () => {
              try {
                const n = await addCOs.mutateAsync({ invoiceId: invoice.id, projectId: invoice.project_id! });
                toast.success(`Added ${n} change order${n === 1 ? '' : 's'}`);
              } catch { /* global toast */ }
            }}
            className="w-full mb-4 py-2 rounded-xl border border-primary/40 text-primary text-[10px] font-bold uppercase tracking-widest hover:bg-primary/10 disabled:opacity-50">
            {addCOs.isPending ? 'Adding…' : `Add ${pendingCOs.length} approved change order${pendingCOs.length === 1 ? '' : 's'} (${pendingCOTotal < 0 ? '-' : ''}$${Math.abs(pendingCOTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`}
          </button>
        )}

        <div className="flex gap-4 mb-4">
          <div className="bg-accent rounded-xl p-3 flex-1 border border-border">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Created</p>
            <p className="text-foreground text-sm mt-0.5">{invoice.created_at ? new Date(invoice.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}</p>
          </div>
          <div className="bg-accent rounded-xl p-3 flex-1 border border-border">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Due</p>
            <p className="text-foreground text-sm mt-0.5">{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}</p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Line Items</p>
          {items.map((item: any, i: number) => (
            <div key={item.id || i} className="bg-accent rounded-xl p-3 border border-border flex justify-between items-center">
              <p className="text-foreground text-sm">{item.description || item.scope || 'Item'}</p>
              <p className="font-serif text-foreground font-bold ml-4">${Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-3 space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Subtotal</span>
            <span>${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          {taxApplied > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Tax</span>
              <span>${taxApplied.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-serif text-primary pt-1">
            <span className="text-sm">Total</span>
            <span className="text-base font-bold">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          {Number(invoice.deposit_applied) > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground"><span>Deposit applied</span><span>-${Number(invoice.deposit_applied).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
          )}
          <div className="flex justify-between text-xs text-muted-foreground"><span>Paid</span><span>-${Number(invoice.amount_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
          <div className="flex justify-between text-sm font-bold text-foreground"><span>Balance due</span><span>${Number(invoice.balance_due ?? total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
        </div>

        {balance > 0 && (
          <form onSubmit={recordPayment} className="mt-4 pt-3 border-t border-border space-y-2">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Record Payment</p>
            <div className="grid grid-cols-2 gap-2">
              <input ref={amountRef} type="number" step="0.01" min="0.01" inputMode="decimal" placeholder="Amount" aria-label="Amount"
                value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
                className="bg-accent border border-border rounded-xl py-2 px-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary" />
              <input type="date" aria-label="Date" value={payDate} onChange={(e) => setPayDate(e.target.value)}
                className="bg-accent border border-border rounded-xl py-2 px-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary" />
              <select aria-label="Method" value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                className="bg-accent border border-border rounded-xl py-2 px-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary">
                <option value="">Method…</option>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <input placeholder={payMethod === 'Zelle' ? 'Zelle confirmation' : 'Check number'} aria-label="Reference" maxLength={80}
                value={payRef} onChange={(e) => setPayRef(e.target.value)}
                className="bg-accent border border-border rounded-xl py-2 px-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <button type="submit" disabled={addPayment.isPending || !payAmount || !payMethod}
              className="w-full bg-primary text-primary-foreground py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest disabled:opacity-50">
              {addPayment.isPending ? 'Saving…' : 'Record Payment'}
            </button>
          </form>
        )}

        <div className="mt-4 pt-3 border-t border-border space-y-1.5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Payments</p>
          {payments.length === 0 ? (
            <p className="text-[11px] text-muted-foreground italic">No payments recorded.</p>
          ) : payments.map(p => (
            <div key={p.id} className="bg-accent rounded-xl px-3 py-2 border border-border flex items-center gap-3 text-[11px]">
              <span className="text-foreground w-20">{new Date(p.paid_on + 'T00:00:00').toLocaleDateString()}</span>
              <span className="text-muted-foreground w-12">{p.method || '—'}</span>
              <span className="text-muted-foreground flex-1 truncate">{p.reference || p.note || ''}</span>
              <span className="font-bold text-foreground">{fmt(Number(p.amount))}</span>
              <button onClick={() => setToDelete(p.id)} className="text-destructive/60 hover:text-destructive p-1" aria-label="Delete payment"><Trash2 size={12} /></button>
            </div>
          ))}
        </div>

        <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this payment?</AlertDialogTitle>
              <AlertDialogDescription>The invoice's paid amount and status will be recalculated from the remaining payments.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeletePayment} disabled={deletePayment.isPending}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="mt-4 pt-3 border-t border-border flex gap-2">
          <button onClick={handleDownload}
            className="flex-1 bg-card border border-primary/40 text-primary py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-primary/10">
            <FileDown size={14} /> PDF
          </button>
          {balance > 0 && (
            <button onClick={fillRemaining}
              className="flex-1 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest bg-primary text-primary-foreground shadow-glow">
              Record remaining balance
            </button>
          )}
        </div>
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

export default InvoiceDetail;
