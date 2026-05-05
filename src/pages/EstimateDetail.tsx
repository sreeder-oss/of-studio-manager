import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Shield, CheckCircle, Clock, Send, FileDown, Pencil, ArrowRight } from 'lucide-react';
import { useEstimate, useDeleteEstimate, useSaveEstimate } from '@/hooks/useEstimates';
import { useContact } from '@/hooks/useContacts';
import { useProjects } from '@/hooks/useProjects';
import { useSaveInvoice } from '@/hooks/useInvoices';
import { useAIPageContext } from '@/hooks/useAIPageContext';
import { LEGAL_TERMS } from '@/lib/legal';
import { downloadEstimatePdf, coerceToEstimateDoc } from '@/lib/estimatePdf';
import { toast } from 'sonner';

const STATUSES = ['Pending', 'Approved', 'Invoiced', 'Declined', 'Expired'] as const;

const EstimateDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: estimate, isLoading } = useEstimate(id!);
  const { data: contact } = useContact(estimate?.contact_id || '');
  const { data: projects = [] } = useProjects();
  const project = projects.find(p => p.id === estimate?.project_id);
  const deleteEstimate = useDeleteEstimate();
  const saveEstimate = useSaveEstimate();
  const saveInvoice = useSaveInvoice();

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
  const deposit = total * 0.5;

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
      await saveEstimate.mutateAsync({ id: estimate.id, status: newStatus, contact_id: estimate.contact_id, line_items: estimate.line_items as any, subtotal, total });
      toast.success(`Status updated to ${newStatus}`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update status');
    }
  };

  const handleConvertToInvoice = async () => {
    try {
      const created: any = await saveInvoice.mutateAsync({
        contact_id: estimate.contact_id,
        project_id: estimate.project_id,
        estimate_id: estimate.id,
        line_items: estimate.line_items as any,
        subtotal,
        tax_applied: tax,
        total,
        due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        paid: false,
      });
      await saveEstimate.mutateAsync({ id: estimate.id, status: 'Invoiced', contact_id: estimate.contact_id, line_items: estimate.line_items as any, subtotal, total });
      toast.success('Invoice created');
      if (created?.id) navigate(`/invoices/${created.id}`);
      else navigate('/invoices');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to convert to invoice');
    }
  };

  const handleDownload = () => {
    const doc = coerceToEstimateDoc(estimate.line_items, {
      title: `Estimate — ${contact?.name || 'Client'}`,
      client_name: contact?.name || '',
      total: Number(estimate.total || 0),
      tax_rate: Number(estimate.tax_rate || 0),
    });
    if (!doc) { toast.error('No estimate data to export'); return; }
    if (!doc.client_name && contact?.name) doc.client_name = contact.name;
    if (!doc.project_address && contact?.address) doc.project_address = contact.address;
    try {
      downloadEstimatePdf(doc);
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
          <button onClick={handleDownload} className="flex items-center gap-1 text-primary hover:text-primary/80 text-[10px] font-bold uppercase tracking-widest">
            <FileDown size={14} /> PDF
          </button>
          {estimate.status === 'Approved' && (
            <button onClick={handleConvertToInvoice} disabled={saveInvoice.isPending}
              className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-glow disabled:opacity-50">
              Convert to Invoice <ArrowRight size={12} />
            </button>
          )}
          <button onClick={handleDelete} className="text-[10px] text-destructive/60 hover:text-destructive font-bold uppercase tracking-widest">
            Delete
          </button>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex justify-between items-start mb-4 gap-3">
          <div>
            <h2 className="font-serif text-foreground text-xl">Estimate</h2>
            <p className="text-muted-foreground text-xs mt-0.5">{contact?.name || 'Unknown Client'}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {estimate.created_at ? new Date(estimate.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
              {estimate.valid_until && ` · Valid until ${new Date(estimate.valid_until).toLocaleDateString()}`}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-widest border flex items-center ${status.classes}`}>
              {status.icon} {estimate.status}
            </span>
            <select
              value={estimate.status || 'Pending'}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={saveEstimate.isPending}
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
          {items.length === 0 ? (
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

        <div className="border-t border-border pt-3 space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Subtotal</span>
            <span>${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Tax ({(taxRate * 100).toFixed(2)}%)</span>
            <span>${tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-lg font-serif text-primary pt-1">
            <span className="text-sm">Total</span>
            <span className="text-base font-bold">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>50% Deposit</span>
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
};

export default EstimateDetail;
