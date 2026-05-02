import React, { useState } from 'react';
import { Check, Plus, X, ExternalLink, UserPlus, FolderPlus, Receipt, BadgeCheck, BarChart3, UserCog, type LucideIcon } from 'lucide-react';
import type { ParsedAction, AIAction } from '@/lib/actionSchema';
import { useAIActions } from '@/hooks/useAIActions';

interface Props {
  parsed: ParsedAction;
  applied: boolean;
  onApplied: (id: string) => void;
}

const META: Record<AIAction['type'], { label: string; icon: LucideIcon; cta: string }> = {
  add_system:           { label: 'Add system',          icon: Plus,        cta: 'Add' },
  update_system:        { label: 'Update system',       icon: UserCog,     cta: 'Save' },
  create_contact:       { label: 'New contact',         icon: UserPlus,    cta: 'Create' },
  update_contact:       { label: 'Update contact',      icon: UserCog,     cta: 'Update' },
  create_project:       { label: 'New project',         icon: FolderPlus,  cta: 'Create' },
  create_receipt:       { label: 'Log receipt',         icon: Receipt,     cta: 'Log' },
  mark_payment_received:{ label: 'Mark invoice paid',   icon: BadgeCheck,  cta: 'Mark paid' },
  query_tax_summary:    { label: 'Open tax summary',    icon: BarChart3,   cta: 'Open report' },
};

const Field: React.FC<{ k: string; v: React.ReactNode }> = ({ k, v }) => (
  <div className="flex justify-between gap-2">
    <span className="text-muted-foreground">{k}</span>
    <span className="text-foreground/90 truncate">{v ?? '—'}</span>
  </div>
);

const renderBody = (a: AIAction): React.ReactNode => {
  switch (a.type) {
    case 'add_system':
    case 'update_system': {
      const d = a.data as any;
      return (
        <>
          {d.description && <p className="text-foreground/70 mb-1.5 line-clamp-2">{d.description}</p>}
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
            <Field k="Manufacturer" v={d.manufacturer ?? '—'} />
            <Field k="Coats" v={d.coats != null ? String(d.coats) : '—'} />
            <Field k="Coverage" v={d.coverage_rate != null ? `${d.coverage_rate} SF/${d.coverage_unit ?? 'unit'}` : '—'} />
            <Field k="Cost" v={d.cost_per_unit != null ? `$${d.cost_per_unit}/${d.coverage_unit ?? 'unit'}` : '—'} />
            <Field k="Labor" v={d.labor_rate_per_sf != null ? `$${d.labor_rate_per_sf}/SF` : '—'} />
          </div>
        </>
      );
    }
    case 'create_contact':
    case 'update_contact': {
      const d = a.data as any;
      return (
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
          <Field k="Type" v={d.type ?? '—'} />
          <Field k="Status" v={d.status ?? '—'} />
          <Field k="Email" v={d.email ?? '—'} />
          <Field k="Phone" v={d.phone ?? '—'} />
          {d.address && <div className="col-span-2"><Field k="Address" v={d.address} /></div>}
        </div>
      );
    }
    case 'create_project': {
      const d = a.data;
      return (
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
          <Field k="Status" v={d.status ?? 'Active'} />
          <Field k="Value" v={d.contract_value != null ? `$${d.contract_value.toLocaleString()}` : '—'} />
          <Field k="Start" v={d.start_date ?? '—'} />
          <Field k="End" v={d.end_date ?? '—'} />
          {d.address && <div className="col-span-2"><Field k="Address" v={d.address} /></div>}
        </div>
      );
    }
    case 'create_receipt': {
      const d = a.data;
      return (
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
          <Field k="Vendor" v={d.vendor ?? '—'} />
          <Field k="Amount" v={`$${d.amount.toFixed(2)}`} />
          <Field k="Date" v={d.receipt_date} />
          <Field k="Category" v={d.category ?? 'Materials'} />
          <Field k="Tax-deductible" v={d.tax_deductible === false ? 'No' : 'Yes'} />
        </div>
      );
    }
    case 'mark_payment_received': {
      const d = a.data;
      return (
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
          <Field k="Invoice" v={d.invoice_id.slice(0, 8) + '…'} />
          <Field k="Paid date" v={d.paid_date ?? 'Today'} />
        </div>
      );
    }
    case 'query_tax_summary':
      return (
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
          <Field k="Tax year" v={a.data.year} />
        </div>
      );
  }
};

const titleFor = (a: AIAction): string => {
  switch (a.type) {
    case 'add_system': return a.data.name;
    case 'update_system': return a.data.name ?? `System ${a.data.id.slice(0, 8)}…`;
    case 'create_contact': return a.data.name;
    case 'update_contact': return a.data.name ?? `Contact ${a.data.id.slice(0, 8)}…`;
    case 'create_project': return a.data.name;
    case 'create_receipt': return a.data.vendor ?? 'Receipt';
    case 'mark_payment_received': return `Invoice ${a.data.invoice_id.slice(0, 8)}…`;
    case 'query_tax_summary': return `Tax summary ${a.data.year}`;
  }
};

const sourceUrlOf = (a: AIAction): string | null => {
  if (a.type === 'add_system' || a.type === 'update_system') return (a.data as any).source_url ?? null;
  return null;
};

export const ActionCard: React.FC<Props> = ({ parsed, applied, onApplied }) => {
  const { run } = useAIActions();
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const a = parsed.action;
  const meta = META[a.type];
  const Icon = meta.icon;
  const src = sourceUrlOf(a);

  const apply = async () => {
    setBusy(true);
    const ok = await run(a);
    setBusy(false);
    if (ok) onApplied(parsed.id);
  };

  return (
    <div className="mt-2 bg-card border border-primary/30 rounded-lg p-2.5 text-[11px]">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0">
          <div className="text-[9px] font-bold uppercase tracking-widest text-primary">{meta.label}</div>
          <div className="font-bold text-foreground truncate">{titleFor(a)}</div>
        </div>
        {src && (
          <a href={src} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary shrink-0">
            <ExternalLink size={12} />
          </a>
        )}
      </div>
      <div className="mb-2">{renderBody(a)}</div>
      {applied ? (
        <div className="flex items-center gap-1.5 text-primary text-[10px] font-bold uppercase tracking-widest">
          <Check size={12} /> Done
        </div>
      ) : (
        <div className="flex gap-1.5">
          <button
            onClick={apply}
            disabled={busy}
            className="flex-1 bg-primary text-primary-foreground rounded-md py-1.5 px-2 flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
          >
            <Icon size={12} /> {busy ? 'Working…' : meta.cta}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="bg-card border border-border text-muted-foreground rounded-md py-1.5 px-2 hover:text-foreground"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
};
