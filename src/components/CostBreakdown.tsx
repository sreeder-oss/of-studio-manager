import React from 'react';
import { Lock } from 'lucide-react';
import type { PricingBreakdown } from '@/lib/pricing';

const money = (n: number) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (f: number) => `${+(Number(f || 0) * 100).toFixed(2)}%`;

/** Internal-only cost breakdown. Never rendered into the client PDF. */
export const CostBreakdown: React.FC<{ b: Partial<PricingBreakdown>; systemName?: string | null}> = ({ b, systemName }) => {
  const Row = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
    <div className={`flex justify-between text-xs ${strong ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
      <span>{label}</span><span className="font-mono">{value}</span>
    </div>
  );
  return (
    <div className="bg-card border border-dashed border-primary/40 rounded-xl p-4 space-y-1.5">
      <div className="flex items-center gap-2 mb-1">
        <Lock size={12} className="text-primary" />
        <span className="text-[9px] font-bold uppercase tracking-widest text-primary">Internal cost breakdown — not on client PDF</span>
      </div>
      {systemName && <Row label="System" value={systemName} />}
      {b.area_sf != null && <Row label="Area" value={`${Number(b.area_sf).toLocaleString()} SF`} />}
      {b.units_needed != null && <Row label="Units needed" value={String(b.units_needed)} />}
      {b.material_cost != null && <Row label="Material" value={money(b.material_cost)} />}
      {b.labor_cost != null && <Row label="Labor" value={money(b.labor_cost)} />}
      {b.sundries_cost != null && <Row label="Sundries" value={money(b.sundries_cost)} />}
      {!!b.extra_direct && <Row label="Other line items" value={money(b.extra_direct)} />}
      <Row label="Direct cost" value={money(b.direct_cost_subtotal ?? 0)} strong />
      <Row label={`Overhead${b.overhead_pct != null ? ` (${pct(b.overhead_pct)})` : ''}`} value={money(b.overhead_amount ?? 0)} />
      <Row label={`Profit${b.profit_pct != null ? ` (${pct(b.profit_pct)})` : ''}`} value={money(b.profit_amount ?? 0)} />
      {!!b.min_charge_adjustment && <Row label={`Minimum charge adjustment (${money(b.min_charge ?? 0)})`} value={money(b.min_charge_adjustment)} />}
      <Row label="Pre-tax total" value={money(b.pre_tax_total ?? 0)} strong />
      <Row label={`Tax${b.tax_rate != null ? ` (${pct(b.tax_rate)})` : ''}`} value={money(b.tax_amount ?? 0)} />
      <Row label="Total" value={money(b.total ?? 0)} strong />
      {!!b.per_sf && <Row label="Per SF" value={money(b.per_sf)} />}
    </div>
  );
};
