import { parseLocalDate, todayLocal, daysFromTodayLocal } from '@/lib/utils';
import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Shield, CheckCircle, Clock, Send, FileDown, Pencil, ArrowRight } from 'lucide-react';
import { useEstimate, useDeleteEstimate } from '@/hooks/useEstimates';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useContact } from '@/hooks/useContacts';
import { useProjects } from '@/hooks/useProjects';
import { useConvertEstimateToInvoice } from '@/hooks/useInvoices';
import { useSystems } from '@/hooks/useSystems';
import { CostBreakdown } from '@/components/CostBreakdown';
import { useAIPageContext } from '@/hooks/useAIPageContext';
import { useSettings, renderTerms, depositAmount, pctLabel } from '@/hooks/useSettings';
import { downloadEstimatePdf, coerceToEstimateDoc } from '@/lib/estimatePdf';
import { isPriceBookLines, toPriceRows, linesMatchSubtotal, rowsSum, totalSf, pricePerSf } from '@/lib/estimateLines';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { localToday, PAYMENT_METHODS, type PaymentMethod } from '@/hooks/useInvoicePayments';

const STATUSES = ['Pending', 'Approved', 'Invoiced', 'Declined', 'Expired'] as const;

const EstimateDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: estimate, isLoading } = useEstimate(id!);
  const { data: contact } = useContact(estimate?.contact_id || '');
  const { data: projects = [] } = useProjects();
  const project = projects.find(p => p.id === estimate?.project_id);
  const deleteEstimate = useDeleteEstimate();
  const queryClient = useQueryClient();
  const convertInvoice = useConvertEstimateToInvoice();
  const [depStep, setDepStep] = React.useState<null | 'ask' | 'details'>(null);
  const [depAmount, setDepAmount] = React.useState('');
  const [depDate, setDepDate] = React.useState('');
  const [depMethod, setDepMethod] = React.useState<PaymentMethod | ''>('');
  const [depRef, setDepRef] = React.useState('');
  const { settings } = useSettings();
  const { data: systems = [] } = useSystems();

  useAIPageContext(estimate ? {
    kind: 'estimate', id: estimate.id,
    total: Number(estimate.total ?? 0),
    contact_name: contact?.name ?? null,
    status: estimate.status,
  } : null);

  if (isLoading) return <div className="text-center py-20 text-muted-foreground text-sm">Loading...</div>;

  if (!estimate) {
    return (
      <div className="text-center py-20 max-w-2xl mx-auto">
        <p className="text-muted-foreground text-sm">Estimate not found.</p>
        <button onClick={() => navigate('/estimates')} className="text-primary text-xs mt-2 hover:underline">Back to Estimates</button>
      </div>
    );
  }

  const items = Array.isArray(estimate.line_items) ? estimate.line_items as any[] : [];
  const subtotal = Number(estimate.subtotal || 0);
  const taxRate = Number(estimate.tax_rate || 0);
  const tax = Number(estimate.tax_amount || subtotal * taxRate);
  const total = Number(estimate.total || 0);
  const deposit = depositAmount(total, settings.default_deposit_pct);
  const priceRows = isPriceBookLines(items) ? toPriceRows(items) : null;
  const linesOk = !priceRows || linesMatchSubtotal(priceRows, subtotal);
  const perSf = priceRows ? pricePerSf(total, priceRows) : 0;
  const money = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getStatusInfo = (status: string | null) => {
    if (status === 'Approved') return { classes: 'bg-primary/10 text-primary border-primary/20', icon: <CheckCircle size={10} className="mr-1" /> };
    if (status === 'Invoiced') return { classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: <Send size={10} className="mr-1" /> };
    if (status === 'Declined' || status === 'Expired') return { classes: 'bg-destructive/10 text-destructive border-destructive/20', icon: <Clock size={10} className="mr-1" /> };
    return { classes: 'bg-warning/10 text-warning border-warning/20', icon: <Clock size={10} className="mr-1" /> };
  };

  const status = getStatusInfo(estimate.status);

  const handleDelete = async () => {
    if (confirm('Delete this estimate?')) {
      await deleteEstimate.mutateAsync(estimate.id);
      toast.success('Estimate deleted');
      navigate('/estimates');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === estimate.status) return;
    try {
      const { error } = await supabase
        .from('estimates')
        .update({ status: newStatus })
        .eq('id', estimate.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['estimates'] });
      toast.success(`Status updated to ${newStatus}`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update status');
    }
  };

  const openConvert = () => {
    if (estimate.status === 'Invoiced') { handleConvertToInvoice(null); return; }
    setDepStep('ask');
    setDepAmount(depositAmount(Number(estimate.total || 0), settings.default_deposit_pct).toFixed(2));
    setDepDate(localToday()); setDepMethod(''); setDepRef('');
  };

  const submitDeposit = () => {
    const amount = parseFloat(depAmount);
    if (!(amount > 0)) { toast.error('Enter the deposit amount'); return; }
    if (!depMethod) { toast.error('Choose Check or Zelle'); return; }
    if (!depDate) { toast.error('Enter the date received'); return; }
    handleConvertToInvoice({ amount, paid_on: depDate, method: depMethod, reference: depRef.trim() });
  };

  const handleConvertToInvoice = async (deposit: { amount: number; paid_on: string; method: PaymentMethod; reference: string } | null) => {
    try {
      const res = await convertInvoice.mutateAsync({ estimate, deposit });
      setDepStep(null);
      toast.success(res.existed ? 'Opening existing invoice' : 'Invoice created');
      navigate(`/invoices/${res.id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownload = () => {
    if (!linesOk) { toast.error('Line amounts do not add up to the subtotal — fix the estimate before downloading'); return; }
    const doc = coerceToEstimateDoc(estimate.line_items, {
      title: `Estimate — ${contact?.name || 'Client'}`,
      client_name: contact?.name || '',
      total: Number(estimate.total || 0),
      tax_rate: Number(estimate.tax_rate || 0),
      valid_until: estimate.valid_until || '',
    });
    if (!doc) { toast.error('No estimate data to export'); return; }
    if (!doc.client_name && contact?.name) doc.client_name = contact.name;
    if (!doc.project_address && contact?.address) doc.project_address = contact.address;
    try {
      downloadEstimatePdf(doc, { depositPct: settings.default_deposit_pct, company: { name: settings.company_name.toUpperCase() } });
      toast.success('PDF downloaded');
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <div className="space-y-4 animate-fade-in pb-20 max-w-2xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button onClick={() => navigate('/estimates')} className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-[10px] font-bold uppercase tracking-widest">
          <ChevronLeft size={14} /> All Estimates
        </button>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => navigate(`/estimates/${estimate.id}/edit`)} className="flex items-center gap-1 text-foreground hover:text-primary text-[10px] font-bold uppercase tracking-widest">
            <Pencil size={12} /> Edit
          </button>
          <button onClick={handleDownload} disabled={!linesOk} className="disabled:opacity-40 flex items-center gap-1 text-primary hover:text-primary/80 text-[10px] font-bold uppercase tracking-widest">
            <FileDown size={14} /> PDF
          </button>
          <button onClick={openConvert}
            disabled={convertInvoice.isPending || !(estimate.status === 'Approved' || estimate.status === 'Invoiced')}
            title={estimate.status === 'Approved' || estimate.status === 'Invoiced' ? undefined : 'Set status to Approved to convert'}
            className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-glow disabled:opacity-40 disabled:shadow-none">
            {estimate.status === 'Invoiced' ? 'Open Invoice' : convertInvoice.isPending ? 'Converting…' : 'Convert to Invoice'} <ArrowRight size={12} />
          </button>
          <button onClick={handleDelete} className="text-[10px] text-destructive/60 hover:text-destructive font-bold uppercase tracking-widest">
            Delete
          </button>
        </div>
      </div>

      <Dialog open={depStep !== null} onOpenChange={(o) => { if (!o && !convertInvoice.isPending) setDepStep(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Was the deposit received?</DialogTitle>
            <DialogDescription>
              {depStep === 'details' ? 'Enter the deposit you received. It will be recorded as a payment on the new invoice.' : 'Only record it if you actually have the check or Zelle payment.'}
            </DialogDescription>
          </DialogHeader>
          {depStep === 'details' && (
            <div className="grid grid-cols-2 gap-2">
              <input type="number" step="0.01" min="0.01" inputMode="decimal" aria-label="Amount" placeholder="Amount" value={depAmount} onChange={e => setDepAmount(e.target.value)}
                className="bg-accent border border-border rounded-xl py-2 px-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary" />
              <input type="date" aria-label="Date" value={depDate} onChange={e => setDepDate(e.target.value)}
                className="bg-accent border border-border rounded-xl py-2 px-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary" />
              <select aria-label="Method" value={depMethod} onChange={e => setDepMethod(e.target.value as PaymentMethod)}
                className="bg-accent border border-border rounded-xl py-2 px-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary">
                <option value="">Method…</option>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <input aria-label="Reference" maxLength={80} placeholder={depMethod === 'Zelle' ? 'Zelle confirmation' : 'Check number'} value={depRef} onChange={e => setDepRef(e.target.value)}
                className="bg-accent border border-border rounded-xl py-2 px-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary" />
            </div>
          )}
          <DialogFooter className="gap-2">
            {depStep === 'ask' ? (
              <>
                <button onClick={() => handleConvertToInvoice(null)} disabled={convertInvoice.isPending}
                  className="px-4 py-2 rounded-xl border border-border text-foreground text-[10px] font-bold uppercase tracking-widest disabled:opacity-50">No</button>
                <button onClick={() => setDepStep('details')} disabled={convertInvoice.isPending}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest disabled:opacity-50">Yes</button>
              </>
            ) : (
              <>
                <button onClick={() => setDepStep('ask')} disabled={convertInvoice.isPending}
                  className="px-4 py-2 rounded-xl border border-border text-foreground text-[10px] font-bold uppercase tracking-widest disabled:opacity-50">Back</button>
                <button onClick={submitDeposit} disabled={convertInvoice.isPending}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest disabled:opacity-50">
                  {convertInvoice.isPending ? 'Creating…' : 'Create invoice'}</button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex justify-between items-start mb-4 gap-3">
          <div>
            <h2 className="font-serif text-foreground text-xl">Estimate</h2>
            <p className="text-muted-foreground text-xs mt-0.5">{contact?.name || 'Unknown Client'}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {estimate.created_at ? new Date(estimate.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
              {estimate.valid_until && ` · Valid until ${parseLocalDate(estimate.valid_until).toLocaleDateString()}`}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-widest border flex items-center ${status.classes}`}>
              {status.icon} {estimate.status}
            </span>
            <select
              value={estimate.status || 'Pending'}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={false}
              className="bg-accent border border-border rounded px-2 py-0.5 text-[10px] text-foreground outline-none"
            >
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {(contact || project) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {contact && (
              <Link to={`/contacts/${contact.id}`} className="bg-accent rounded-xl p-3 border border-border hover:border-primary/40 transition">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Client</p>
                <p className="text-foreground text-sm font-semibold">{contact.name}</p>
                {contact.email && <p className="text-muted-foreground text-[11px]">{contact.email}</p>}
                {contact.phone && <p className="text-muted-foreground text-[11px]">{contact.phone}</p>}
                {contact.address && <p className="text-muted-foreground text-[11px]">{contact.address}</p>}
              </Link>
            )}
            {project && (
              <Link to={`/projects/${project.id}`} className="bg-accent rounded-xl p-3 border border-border hover:border-primary/40 transition">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Project</p>
                <p className="text-foreground text-sm font-semibold">{project.name}</p>
                {project.address && <p className="text-muted-foreground text-[11px]">{project.address}</p>}
              </Link>
            )}
          </div>
        )}

        <div className="space-y-2 mb-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Line Items</p>
          {priceRows ? (
            <div className="bg-accent rounded-xl border border-border overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-[9px] uppercase tracking-widest text-muted-foreground border-b border-border">
                    <th className="text-left p-2 font-bold">Description</th>
                    <th className="text-right p-2 font-bold">Qty</th>
                    <th className="text-left p-2 font-bold">Unit</th>
                    <th className="text-right p-2 font-bold">Rate</th>
                    <th className="text-right p-2 font-bold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {priceRows.map((r, i) => r.kind === 'service' ? (
                    <tr key={i} className="border-t border-border/60">
                      <td className="p-2 text-foreground">{r.description}{r.note && <p className="text-[10px] text-muted-foreground">{r.note}</p>}</td>
                      <td className="p-2 text-right text-foreground">{r.qty.toLocaleString()}</td>
                      <td className="p-2 text-foreground">{r.unit}</td>
                      <td className="p-2 text-right text-foreground">{money(r.rate)}</td>
                      <td className="p-2 text-right font-bold text-foreground">{money(r.amount)}</td>
                    </tr>
                  ) : (
                    <tr key={i} className={r.kind === 'other' ? 'border-t border-border/60' : ''}>
                      <td colSpan={4} className={`p-2 ${r.kind === 'materials' ? 'pl-6 italic text-muted-foreground' : 'text-foreground'}`}>{r.description}</td>
                      <td className={`p-2 text-right ${r.kind === 'materials' ? 'text-muted-foreground' : 'font-bold text-foreground'}`}>{money(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground text-[11px] italic">No line items.</p>
          ) : items.map((item: any, i: number) => (
            <div key={item.id || i} className="bg-accent rounded-xl p-3 border border-border">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  {item.scope && <p className="text-foreground text-sm font-semibold">{item.scope}</p>}
                  {item.materials && <p className="text-muted-foreground text-[11px] mt-0.5">Materials: {item.materials}</p>}
                  {!item.scope && item.description && <p className="text-foreground text-sm">{item.description}</p>}
                </div>
                <p className="font-serif text-foreground font-bold ml-4">${Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          ))}
        </div>

        {!linesOk && priceRows && (
          <div className="mb-3 rounded-lg border border-destructive bg-destructive/10 p-2 text-[11px] text-destructive font-semibold">
            Line amounts add up to {money(rowsSum(priceRows))}, but the subtotal is {money(subtotal)}. PDF download is blocked until this is fixed.
          </div>
        )}
        <div className="border-t border-border pt-3 space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Subtotal</span>
            <span>${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          {tax > 0 && <div className="flex justify-between text-xs text-muted-foreground">
            <span>Tax ({(taxRate * 100).toFixed(2)}%)</span>
            <span>${tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>}
          <div className="flex justify-between text-lg font-serif text-primary pt-1">
            <span className="text-sm">Total</span>
            <span className="text-base font-bold">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          {perSf > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Price per square foot ({totalSf(priceRows!).toLocaleString()} SF)</span>
              <span>{money(perSf)}</span>
            </div>
          )}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{pctLabel(settings.default_deposit_pct)}% Deposit (requested)</span>
            <span>${deposit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {estimate.notes && (
          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Notes</p>
            <p className="text-[11px] text-muted-foreground whitespace-pre-wrap">{estimate.notes}</p>
          </div>
        )}
      </div>

      {Number(estimate.direct_cost_subtotal) > 0 && (
        <CostBreakdown systemName={systems.find(s => s.id === estimate.system_id)?.name}
          b={{
            area_sf: estimate.area_sf != null ? Number(estimate.area_sf) : undefined,
            direct_cost_subtotal: Number(estimate.direct_cost_subtotal),
            overhead_amount: Number(estimate.overhead_amount),
            profit_amount: Number(estimate.profit_amount),
            pre_tax_total: Number(estimate.pre_tax_total),
            tax_rate: Number(estimate.tax_rate), tax_amount: Number(estimate.tax_amount),
            total: Number(estimate.total),
            per_sf: Number(estimate.area_sf) > 0 ? +(Number(estimate.total) / Number(estimate.area_sf)).toFixed(2) : 0,
          }} />
      )}

      <div className="bg-card/50 border border-border rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={12} className="text-primary" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Terms & Conditions</span>
        </div>
        {renderTerms(settings).map((text, key) => (
          <p key={key} className="text-[9px] text-muted-foreground leading-relaxed">{text}</p>
        ))}
      </div>
    </div>
  );
};

export default EstimateDetail;
