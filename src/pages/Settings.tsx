import React, { useEffect, useState } from 'react';
import { useSettings, useSaveSettings, DEFAULT_TERMS_TEXT, type Settings as S } from '@/hooks/useSettings';
import { toast } from 'sonner';

type PctKey = 'default_tax_rate' | 'default_overhead_pct' | 'default_profit_pct' | 'default_deposit_pct' | 'default_waste_factor' | 'sundries_pct';
type MoneyKey = 'minimum_charge' | 'mobilization_fee';

const PCT_FIELDS: [PctKey, string][] = [
  ['default_tax_rate', 'Sales tax'],
  ['default_deposit_pct', 'Deposit requested'],
  ['default_overhead_pct', 'Overhead'],
  ['default_profit_pct', 'Profit'],
  ['default_waste_factor', 'Waste factor'],
  ['sundries_pct', 'Sundries'],
];
const MONEY_FIELDS: [MoneyKey, string][] = [
  ['minimum_charge', 'Minimum charge'],
  ['mobilization_fee', 'Mobilization fee'],
];

const inputCls = 'w-full bg-accent border border-border rounded-lg p-2 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary';
const labelCls = 'block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1';

const Settings: React.FC = () => {
  const { settings, isLoading } = useSettings();
  const save = useSaveSettings();
  const [f, setF] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isLoading) return;
    const next: Record<string, string> = {};
    PCT_FIELDS.forEach(([k]) => { next[k] = String(+(Number(settings[k]) * 100).toFixed(4)); });
    MONEY_FIELDS.forEach(([k]) => { next[k] = String(settings[k] ?? 0); });
    next.company_name = settings.company_name || '';
    next.company_address = settings.company_address || '';
    next.license_number = settings.license_number || '';
    next.terms_text = settings.terms_text || DEFAULT_TERMS_TEXT;
    setF(next);
  }, [isLoading, settings]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const out: Partial<S> = {};
    for (const [k, label] of PCT_FIELDS) {
      const v = parseFloat(f[k]);
      if (!Number.isFinite(v) || v < 0 || v > 100 || (k !== 'default_deposit_pct' && v >= 100)) { toast.error(`${label} must be between 0 and 100`); return; }
      out[k] = v / 100;
    }
    for (const [k, label] of MONEY_FIELDS) {
      const v = parseFloat(f[k] || '0');
      if (!Number.isFinite(v) || v < 0) { toast.error(`${label} can't be negative`); return; }
      out[k] = v;
    }
    if (!f.company_name?.trim()) { toast.error('Company name is required'); return; }
    try {
      await save.mutateAsync({
        ...(out as S),
        company_name: f.company_name.trim(),
        company_address: f.company_address?.trim() || null,
        license_number: f.license_number?.trim() || null,
        terms_text: f.terms_text?.trim() || null,
      });
      toast.success('Settings saved');
    } catch { /* global toast */ }
  };

  if (isLoading) return <div className="text-center py-20 text-muted-foreground text-sm">Loading settings...</div>;

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <form onSubmit={submit} className="space-y-4 animate-fade-in pb-20 max-w-2xl mx-auto">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-serif text-foreground tracking-tight">Settings</h2>
          <p className="text-muted-foreground text-[9px] uppercase tracking-widest mt-0.5 font-bold">Estimate & Invoice Defaults</p>
        </div>
        <button type="submit" disabled={save.isPending}
          className="bg-primary text-primary-foreground px-4 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-glow disabled:opacity-50">
          {save.isPending ? 'Saving...' : 'Save'}
        </button>
      </header>

      <section className="bg-card border border-border rounded-xl p-4 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Company</p>
        <div><label className={labelCls}>Company name</label><input className={inputCls} value={f.company_name || ''} onChange={set('company_name')} /></div>
        <div><label className={labelCls}>Company address</label><input className={inputCls} value={f.company_address || ''} onChange={set('company_address')} /></div>
        <div><label className={labelCls}>License number</label><input className={inputCls} value={f.license_number || ''} onChange={set('license_number')} /></div>
      </section>

      <section className="bg-card border border-border rounded-xl p-4 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Rates (%)</p>
        <div className="grid grid-cols-2 gap-3">
          {PCT_FIELDS.map(([k, label]) => (
            <div key={k}><label className={labelCls}>{label} %</label>
              <input type="number" step="0.01" inputMode="decimal" className={inputCls} value={f[k] ?? ''} onChange={set(k)} /></div>
          ))}
        </div>
      </section>

      <section className="bg-card border border-border rounded-xl p-4 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Fees ($)</p>
        <div className="grid grid-cols-2 gap-3">
          {MONEY_FIELDS.map(([k, label]) => (
            <div key={k}><label className={labelCls}>{label}</label>
              <input type="number" step="0.01" inputMode="decimal" className={inputCls} value={f[k] ?? ''} onChange={set(k)} /></div>
          ))}
        </div>
      </section>

      <section className="bg-card border border-border rounded-xl p-4 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Terms & Conditions</p>
        <p className="text-[10px] text-muted-foreground">Separate sections with a blank line. Type <code className="text-primary">{'{deposit}'}</code> to insert the deposit percentage.</p>
        <textarea className={`${inputCls} h-72 resize-y leading-relaxed`} value={f.terms_text || ''} onChange={set('terms_text')} />
      </section>
    </form>
  );
};

export default Settings;
