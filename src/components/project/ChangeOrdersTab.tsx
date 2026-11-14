import { parseLocalDate, todayLocal, daysFromTodayLocal } from '@/lib/utils';
import React, { useState } from 'react';
import { Plus, Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import { useChangeOrders, useSaveChangeOrder, useSetChangeOrderStatus, CHANGE_ORDER_STATUSES, type ChangeOrder, type ChangeOrderStatus } from '@/hooks/useChangeOrders';
import { localToday } from '@/hooks/useInvoicePayments';

const inputCls = 'w-full bg-accent border border-border rounded-xl py-2 px-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary';
const money = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const statusCls: Record<string, string> = {
  Approved: 'bg-primary/10 text-primary border-primary/20',
  Proposed: 'bg-warning/10 text-warning border-warning/20',
  Declined: 'bg-destructive/10 text-destructive border-destructive/20',
};

type Form = { id?: string; description: string; amount: string; agreed_on: string; status: ChangeOrderStatus; notes: string };
const blank = (): Form => ({ description: '', amount: '', agreed_on: localToday(), status: 'Proposed', notes: '' });

export const ChangeOrdersTab: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { data: cos = [], isLoading } = useChangeOrders(projectId);
  const save = useSaveChangeOrder();
  const setStatus = useSetChangeOrderStatus();
  const [form, setForm] = useState<Form | null>(null);

  const edit = (c: ChangeOrder) => setForm({ id: c.id, description: c.description, amount: String(c.amount), agreed_on: c.agreed_on || '', status: c.status as ChangeOrderStatus, notes: c.notes || '' });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const amount = parseFloat(form.amount);
    if (!form.description.trim()) { toast.error('Enter a description'); return; }
    if (!Number.isFinite(amount) || amount === 0) { toast.error('Enter an amount (negative for a credit)'); return; }
    try {
      await save.mutateAsync({ id: form.id, project_id: projectId, description: form.description.trim(), amount: Math.round(amount * 100) / 100,
        agreed_on: form.agreed_on || null, status: form.status, notes: form.notes.trim() || null });
      toast.success(form.id ? 'Change order updated' : 'Change order added');
      setForm(null);
    } catch { /* global toast */ }
  };

  return (
    <div className="space-y-2">
      {form ? (
        <form onSubmit={submit} className="bg-card p-4 rounded-xl border border-border space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{form.id ? 'Edit change order' : 'New change order'}</p>
            <button type="button" onClick={() => setForm(null)} className="text-muted-foreground p-1" aria-label="Cancel"><X size={14} /></button>
          </div>
          <input className={inputCls} placeholder="Description" aria-label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-3 gap-2">
            <input className={inputCls} type="number" step="0.01" placeholder="Amount" aria-label="Amount" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            <input className={inputCls} type="date" aria-label="Date agreed" value={form.agreed_on} onChange={e => setForm({ ...form, agreed_on: e.target.value })} />
            <select className={inputCls} aria-label="Status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as ChangeOrderStatus })}>
              {CHANGE_ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <p className="text-[10px] text-muted-foreground">Use a negative amount for a credit.</p>
          <textarea className={`${inputCls} h-16 resize-none`} placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <button type="submit" disabled={save.isPending} className="w-full bg-primary text-primary-foreground py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest disabled:opacity-50">
            {save.isPending ? 'Saving…' : 'Save change order'}
          </button>
        </form>
      ) : (
        <button onClick={() => setForm(blank())} className="w-full py-2 border border-dashed border-border text-muted-foreground rounded-xl text-[10px] uppercase tracking-widest font-bold flex items-center justify-center gap-1 hover:text-primary">
          <Plus size={12} /> Add change order
        </button>
      )}

      {isLoading ? null : cos.length === 0 ? (
        <div className="text-center py-10 bg-card rounded-xl border border-dashed border-border">
          <p className="text-muted-foreground text-[11px]">No change orders for this project yet.</p>
        </div>
      ) : cos.map(c => (
        <div key={c.id} className="bg-card p-3 rounded-xl border border-border space-y-2">
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1">
              <p className="text-foreground text-sm font-semibold">{c.description}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {c.agreed_on ? `Agreed ${parseLocalDate(c.agreed_on).toLocaleDateString()}` : 'No date agreed'}
                {' · '}{c.invoice_id ? <span className="text-primary font-bold">Invoiced</span> : 'Not invoiced'}
              </p>
              {c.notes && <p className="text-[11px] text-muted-foreground mt-1">{c.notes}</p>}
            </div>
            <p className={`font-serif font-bold ${Number(c.amount) < 0 ? 'text-destructive' : 'text-foreground'}`}>{money(Number(c.amount))}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-widest border ${statusCls[c.status] || ''}`}>{c.status}</span>
            <select aria-label="Set status" value={c.status} disabled={setStatus.isPending}
              onChange={e => setStatus.mutate({ id: c.id, status: e.target.value as ChangeOrderStatus }, { onSuccess: () => toast.success(`Marked ${e.target.value}`) })}
              className="bg-accent border border-border rounded px-2 py-0.5 text-[10px] text-foreground outline-none">
              {CHANGE_ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={() => edit(c)} className="ml-auto flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary"><Pencil size={11} /> Edit</button>
          </div>
        </div>
      ))}
    </div>
  );
};
