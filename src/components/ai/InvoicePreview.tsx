import React, { useMemo, useState } from 'react';
import { X, Save, Trash2, Plus, FileDown } from 'lucide-react';
import { recalcInvoice, type InvoiceDoc } from '@/lib/invoiceSchema';
import { downloadInvoicePdf } from '@/lib/invoicePdf';
import { useContacts } from '@/hooks/useContacts';
import { useProjects } from '@/hooks/useProjects';
import { useSaveInvoice } from '@/hooks/useInvoices';
import { toast } from 'sonner';

interface Props {
  initial: InvoiceDoc;
  onClose: () => void;
}

const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const InvoicePreview: React.FC<Props> = ({ initial, onClose }) => {
  const [doc, setDoc] = useState<InvoiceDoc>(() => recalcInvoice(initial));
  const { data: contacts = [] } = useContacts();
  const { data: projects = [] } = useProjects();
  const saveInvoice = useSaveInvoice();

  const matchedContactId = useMemo(() => {
    if (!doc.client_name) return '';
    const c = contacts.find((x) => x.name.toLowerCase() === doc.client_name.toLowerCase());
    return c?.id ?? '';
  }, [contacts, doc.client_name]);
  const matchedProjectId = useMemo(() => {
    if (!doc.project_name) return '';
    const p = projects.find((x) => x.name.toLowerCase() === doc.project_name.toLowerCase());
    return p?.id ?? '';
  }, [projects, doc.project_name]);
  const [contactId, setContactId] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');

  React.useEffect(() => { if (matchedContactId && !contactId) setContactId(matchedContactId); }, [matchedContactId, contactId]);
  React.useEffect(() => { if (matchedProjectId && !projectId) setProjectId(matchedProjectId); }, [matchedProjectId, projectId]);

  const update = (next: InvoiceDoc) => setDoc(recalcInvoice(next));

  const updateLine = (sIdx: number, lIdx: number, field: 'description' | 'qty' | 'unit' | 'unit_cost', value: string | number) => {
    const sections = doc.sections.map((s, i) => {
      if (i !== sIdx) return s;
      const items = s.line_items.map((li, j) =>
        j === lIdx ? { ...li, [field]: field === 'description' || field === 'unit' ? String(value) : Number(value) || 0 } : li
      );
      return { ...s, line_items: items };
    });
    update({ ...doc, sections });
  };

  const addLine = (sIdx: number) => {
    const sections = doc.sections.map((s, i) =>
      i === sIdx ? { ...s, line_items: [...s.line_items, { description: '', sub_note: '', qty: 1, unit: 'EA', unit_cost: 0, total: 0 }] } : s
    );
    update({ ...doc, sections });
  };

  const removeLine = (sIdx: number, lIdx: number) => {
    const sections = doc.sections.map((s, i) =>
      i === sIdx ? { ...s, line_items: s.line_items.filter((_, j) => j !== lIdx) } : s
    );
    update({ ...doc, sections });
  };

  const handleSave = async () => {
    if (!contactId) { toast.error('Select a client to save the invoice'); return; }
    try {
      await saveInvoice.mutateAsync({
        contact_id: contactId,
        project_id: projectId || null,
        line_items: doc as any, // store full structured doc in jsonb
        subtotal: doc.subtotal,
        tax_applied: doc.tax_amount,
        total: doc.total,
        due_date: doc.due_date || null,
        paid: doc.balance_due <= 0.005,
      });
      toast.success('Invoice saved');
      onClose();
    } catch {
      toast.error('Failed to save invoice');
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div>
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">AI Invoice Preview</p>
          <h3 className="font-serif text-sm text-foreground leading-tight">
            {doc.invoice_number ? `${doc.invoice_number} — ` : ''}{doc.title}
          </h3>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-accent rounded-full text-muted-foreground"><X size={16} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Client *</label>
            <select value={contactId} onChange={(e) => setContactId(e.target.value)}
              className="w-full bg-card border border-border rounded-lg py-1.5 px-2 text-[11px] text-foreground outline-none focus:ring-1 focus:ring-primary">
              <option value="">Select client...</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Project</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
              className="w-full bg-card border border-border rounded-lg py-1.5 px-2 text-[11px] text-foreground outline-none focus:ring-1 focus:ring-primary">
              <option value="">No project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-3 text-[11px] space-y-1">
          {doc.milestone && <div className="flex justify-between"><span className="text-muted-foreground">Milestone</span><span className="text-foreground">{doc.milestone}</span></div>}
          {doc.service_period && <div className="flex justify-between"><span className="text-muted-foreground">Service period</span><span className="text-foreground">{doc.service_period}</span></div>}
          {doc.invoice_date && <div className="flex justify-between"><span className="text-muted-foreground">Issued</span><span className="text-foreground">{doc.invoice_date}</span></div>}
          {doc.due_date && <div className="flex justify-between"><span className="text-muted-foreground">Due</span><span className="text-foreground">{doc.due_date}</span></div>}
          {doc.work_summary && <p className="text-[10px] italic text-muted-foreground pt-1 border-t border-border/50 mt-1">{doc.work_summary}</p>}
        </div>

        {doc.sections.map((s, sIdx) => (
          <div key={sIdx} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-3 py-2 bg-secondary/40 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">{s.label}</span>
              <span className="text-[11px] text-primary font-mono">{fmt(s.subtotal)}</span>
            </div>
            <div className="p-2 space-y-2">
              {s.line_items.map((li, lIdx) => (
                <div key={lIdx} className="space-y-1 border-b border-border/50 last:border-0 pb-2 last:pb-0">
                  <input value={li.description} onChange={(e) => updateLine(sIdx, lIdx, 'description', e.target.value)}
                    className="w-full bg-accent border border-border rounded px-2 py-1 text-[11px] text-foreground outline-none" />
                  {li.sub_note && <p className="text-[9px] italic text-muted-foreground px-1">{li.sub_note}</p>}
                  <div className="flex gap-1.5 items-center text-[10px]">
                    <input type="number" value={li.qty} onChange={(e) => updateLine(sIdx, lIdx, 'qty', e.target.value)}
                      className="w-14 bg-accent border border-border rounded px-1.5 py-1 text-right outline-none" />
                    <input value={li.unit} onChange={(e) => updateLine(sIdx, lIdx, 'unit', e.target.value)}
                      className="w-12 bg-accent border border-border rounded px-1.5 py-1 outline-none" />
                    <span className="text-muted-foreground">@</span>
                    <input type="number" value={li.unit_cost} onChange={(e) => updateLine(sIdx, lIdx, 'unit_cost', e.target.value)}
                      className="w-16 bg-accent border border-border rounded px-1.5 py-1 text-right outline-none" />
                    <span className="flex-1 text-right font-mono text-primary">{fmt(li.total)}</span>
                    <button onClick={() => removeLine(sIdx, lIdx)} className="text-destructive p-1"><Trash2 size={11} /></button>
                  </div>
                </div>
              ))}
              <button onClick={() => addLine(sIdx)} className="w-full text-[9px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground py-1 flex items-center justify-center gap-1">
                <Plus size={10} /> Add line
              </button>
            </div>
          </div>
        ))}

        <div className="bg-card border border-border rounded-xl p-3 text-[11px] space-y-1.5">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-mono">{fmt(doc.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tax ({doc.tax_rate}%)</span><span className="font-mono">{fmt(doc.tax_amount)}</span></div>
          <div className="flex justify-between pt-2 border-t border-border text-foreground"><span>Invoice total</span><span className="font-mono">{fmt(doc.total)}</span></div>
          {doc.deposit_applied > 0 && (
            <div className="flex justify-between text-muted-foreground"><span>Deposit applied</span><span className="font-mono">({fmt(doc.deposit_applied)})</span></div>
          )}
          {doc.amount_paid - doc.deposit_applied > 0.005 && (
            <div className="flex justify-between text-muted-foreground"><span>Payments received</span><span className="font-mono">({fmt(doc.amount_paid - doc.deposit_applied)})</span></div>
          )}
          <div className="flex justify-between pt-2 border-t border-border text-base font-serif text-primary">
            <span className="text-sm">Balance due</span><span className="text-base font-bold">{fmt(doc.balance_due)}</span>
          </div>
        </div>

        {doc.prior_payments.length > 0 && (
          <div className="text-[10px]">
            <p className="font-bold uppercase tracking-widest text-muted-foreground mb-1">Payments received</p>
            <ul className="text-foreground/80 space-y-0.5">
              {doc.prior_payments.map((p, i) => (
                <li key={i} className="flex justify-between"><span>{p.date} · {p.method || '—'} {p.note ? `· ${p.note}` : ''}</span><span className="font-mono text-primary">{fmt(p.amount)}</span></li>
              ))}
            </ul>
          </div>
        )}

        {(doc.payment_terms || doc.payment_methods.length > 0 || doc.late_fee_note) && (
          <div className="text-[10px] bg-accent/40 border border-border rounded-xl p-3 space-y-1">
            <p className="font-bold uppercase tracking-widest text-muted-foreground">Payment instructions</p>
            {doc.payment_terms && <p className="text-foreground/80">{doc.payment_terms}</p>}
            {doc.payment_methods.length > 0 && <p className="text-foreground/80">Accepted: {doc.payment_methods.join(', ')}.</p>}
            {doc.late_fee_note && <p className="text-foreground/80">{doc.late_fee_note}</p>}
          </div>
        )}

        {doc.notes.length > 0 && (
          <div className="text-[10px]">
            <p className="font-bold uppercase tracking-widest text-muted-foreground mb-1">Notes</p>
            <ul className="list-disc list-inside text-foreground/80 space-y-0.5">{doc.notes.map((a, i) => <li key={i}>{a}</li>)}</ul>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border flex gap-2">
        <button
          onClick={() => {
            try { downloadInvoicePdf(doc); toast.success('PDF downloaded'); }
            catch (e) { console.error(e); toast.error('Failed to generate PDF'); }
          }}
          className="flex-1 bg-card border border-primary/40 text-primary py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-primary/10"
        >
          <FileDown size={14} /> PDF
        </button>
        <button onClick={handleSave} disabled={saveInvoice.isPending || !contactId}
          className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-glow disabled:opacity-50 flex items-center justify-center gap-2">
          <Save size={14} /> {saveInvoice.isPending ? 'Saving...' : 'Save Invoice'}
        </button>
      </div>
    </div>
  );
};
