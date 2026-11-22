import React, { useEffect, useState } from 'react';
import { useSettings, useSaveSettings, DEFAULT_TERMS_TEXT, type Settings as S } from '@/hooks/useSettings';
import { useAIAssistantOptional } from '@/contexts/AIAssistantContext';
import { AI_MODELS, getStoredModelId, setStoredModelId, getStoredDeepSeekKey, setStoredDeepSeekKey } from '@/lib/aiModels';
import { Check, Brain, Key, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

type PctKey = 'default_tax_rate' | 'default_deposit_pct' | 'default_waste_factor';
type MoneyKey = 'minimum_charge' | 'mobilization_fee';

const PCT_FIELDS: [PctKey, string, string][] = [
  ['default_tax_rate', 'Sales Tax %', 'Default is 0%. Hidden on estimates & invoices until set > 0.'],
  ['default_deposit_pct', 'Deposit Requested %', 'Standard upfront deposit required to schedule work.'],
  ['default_waste_factor', 'Material Waste Factor %', 'Standard 12% allowance for cuts, mixing loss, and surface prep.'],
];
const MONEY_FIELDS: [MoneyKey, string, string][] = [
  ['minimum_charge', 'Plaster Minimum Charge ($)', 'Minimum charge for plaster work (multi-day staging/cure process) + materials.'],
  ['mobilization_fee', 'Mobilization / Trip Fee ($)', 'Optional transport/staging charge for jobs outside local area.'],
];

const inputCls = 'w-full bg-accent border border-border rounded-lg p-2 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary';
const labelCls = 'block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1';

const Settings: React.FC = () => {
  const { settings, isLoading } = useSettings();
  const save = useSaveSettings();
  const aiCtx = useAIAssistantOptional();
  const [currentModel, setCurrentModel] = useState<string>(() => aiCtx?.modelId ?? getStoredModelId());
  const [f, setF] = useState<Record<string, string>>({});
  const [apiKey, setApiKey] = useState<string>(() => getStoredDeepSeekKey());
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (aiCtx?.modelId) {
      setCurrentModel(aiCtx.modelId);
    }
  }, [aiCtx?.modelId]);

  const handleModelChange = (id: string) => {
    setCurrentModel(id);
    setStoredModelId(id);
    if (aiCtx) {
      aiCtx.setModelId(id);
    }
    toast.success('Default AI model updated');
  };

  const handleSaveApiKey = () => {
    setStoredDeepSeekKey(apiKey);
    if (apiKey.trim()) {
      toast.success('DeepSeek API key saved');
    } else {
      toast.info('DeepSeek API key cleared');
    }
  };

  useEffect(() => {
    if (isLoading) return;
    const next: Record<string, string> = {};
    PCT_FIELDS.forEach(([k]) => { next[k] = String(+(Number(settings[k]) * 100).toFixed(4)); });
    MONEY_FIELDS.forEach(([k]) => { next[k] = String(settings[k] ?? 0); });
    next.company_name = settings.company_name || '';
    next.company_address = settings.company_address || '';
    next.license_number = settings.license_number || '';
    next.payee_name = settings.payee_name || 'Shawn Reeder';
    next.zelle_contact = settings.zelle_contact || '';
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
    if (!f.payee_name?.trim()) { toast.error('Checks payable to is required'); return; }
    try {
      await save.mutateAsync({
        ...(out as S),
        default_overhead_pct: 0,
        default_profit_pct: 0,
        sundries_pct: 0,
        company_name: f.company_name.trim(),
        company_address: f.company_address?.trim() || null,
        license_number: f.license_number?.trim() || null,
        payee_name: f.payee_name.trim(),
        zelle_contact: f.zelle_contact?.trim() || null,
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
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Getting paid</p>
        <div><label className={labelCls}>Checks payable to</label><input className={inputCls} value={f.payee_name || ''} onChange={set('payee_name')} /></div>
        <div><label className={labelCls}>Zelle contact (email or phone, optional)</label><input className={inputCls} value={f.zelle_contact || ''} onChange={set('zelle_contact')} /></div>
      </section>

      <section className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain size={14} className="text-primary" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">AI Assistant Engine</p>
          </div>
          <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-muted-foreground font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            DeepSeek V4.1 Flash
          </span>
        </div>

        {/* Model Card */}
        <div className="p-3.5 rounded-lg border border-primary/40 bg-primary/5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">DeepSeek V4.1 Flash</span>
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/20 text-primary">Default</span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">CED MoE 552B</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Multimodal Mixture-of-Experts model with native visual understanding, fast compressed KV caching, and superior trade estimating and blueprint extraction.
          </p>
        </div>

        {/* API Key Configuration */}
        <div className="pt-2 border-t border-border space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              <Key size={12} className="text-primary" />
              DeepSeek API Key
            </label>
            <span className="text-[9px] text-muted-foreground">Direct API or OpenRouter</span>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? 'text' : 'password'}
                placeholder="sk-..."
                className={`${inputCls} pr-9 font-mono text-xs`}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                title={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <button
              type="button"
              onClick={handleSaveApiKey}
              className="px-3 py-1.5 rounded-lg border border-primary bg-primary/10 hover:bg-primary/20 text-primary font-bold text-[10px] uppercase tracking-wider shrink-0 transition-colors"
            >
              Save Key
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Paste your DeepSeek API key here, or configure <code className="text-primary">DEEPSEEK_API_KEY</code> in your environment secrets.
          </p>
        </div>
      </section>

      <section className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Rates & Waste Factor</p>
          <span className="text-[9px] text-muted-foreground">Profit is in the labor rate</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PCT_FIELDS.map(([k, label, help]) => (
            <div key={k} className="space-y-1">
              <label className={labelCls}>{label}</label>
              <input type="number" step="0.01" inputMode="decimal" className={inputCls} value={f[k] ?? ''} onChange={set(k)} />
              <p className="text-[10px] text-muted-foreground leading-tight">{help}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/50">
          * Materials pass through at cost with 12% standard waste factor. Prep tape, plastic, and sundries are itemized/included as materials at cost (no blanket percentage markup).
        </p>
      </section>

      <section className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Job Minimums & Fees</p>
          <span className="text-[9px] text-muted-foreground font-mono">Plaster $850 min | Paint $300 min</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {MONEY_FIELDS.map(([k, label, help]) => (
            <div key={k} className="space-y-1">
              <label className={labelCls}>{label}</label>
              <input type="number" step="1" inputMode="decimal" className={inputCls} value={f[k] ?? ''} onChange={set(k)} />
              <p className="text-[10px] text-muted-foreground leading-tight">{help}</p>
            </div>
          ))}
        </div>
        <div className="p-2.5 rounded-lg bg-accent/40 border border-border text-[11px] text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground">Standard Minimum Guidelines:</p>
          <p>• <strong>Plaster Minimum</strong>: $850 + materials (plaster is never done in 1 day; accounts for staging, coats & cure cycles).</p>
          <p>• <strong>Paint / Patch Minimum</strong>: $300 + materials to mobilize on-site.</p>
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
