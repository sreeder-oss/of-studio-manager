import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Shield, CheckCircle, Clock, Send } from 'lucide-react';
import { useEstimate, useDeleteEstimate } from '@/hooks/useEstimates';
import { useContact } from '@/hooks/useContacts';
import { useAIPageContext } from '@/hooks/useAIPageContext';
import { LEGAL_TERMS } from '@/lib/legal';
import { toast } from 'sonner';

const EstimateDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: estimate, isLoading } = useEstimate(id!);
  const { data: contact } = useContact(estimate?.contact_id || '');
  const deleteEstimate = useDeleteEstimate();

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
  const tax = subtotal * taxRate;
  const total = Number(estimate.total || 0);
  const deposit = total * 0.5;

  const getStatusInfo = (status: string | null) => {
    if (status === 'Approved') return { label: 'Approved', classes: 'bg-primary/10 text-primary border-primary/20', icon: <CheckCircle size={10} className="mr-1" /> };
    if (status === 'Invoiced') return { label: 'Invoiced', classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: <Send size={10} className="mr-1" /> };
    return { label: 'Pending', classes: 'bg-warning/10 text-warning border-warning/20', icon: <Clock size={10} className="mr-1" /> };
  };

  const status = getStatusInfo(estimate.status);

  const handleDelete = async () => {
    if (confirm('Delete this estimate?')) {
      await deleteEstimate.mutateAsync(estimate.id);
      toast.success('Estimate deleted');
      navigate('/estimates');
    }
  };

  return (
    <div className="space-y-4 animate-fade-in pb-20 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/estimates')} className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-[10px] font-bold uppercase tracking-widest">
          <ChevronLeft size={14} /> All Estimates
        </button>
        <button onClick={handleDelete} className="text-[10px] text-destructive/60 hover:text-destructive font-bold uppercase tracking-widest">
          Delete
        </button>
      </div>

      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="font-serif text-foreground text-xl">Estimate</h2>
            <p className="text-muted-foreground text-xs mt-0.5">{contact?.name || 'Unknown Client'}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {estimate.created_at ? new Date(estimate.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
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
          {items.map((item: any, i: number) => (
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
          {taxRate > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Tax ({(taxRate * 100).toFixed(2)}%)</span>
              <span>${tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-serif text-primary pt-1">
            <span className="text-sm">Total</span>
            <span className="text-base font-bold">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>50% Deposit</span>
            <span>${deposit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
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
