import React, { useState } from 'react';
import { Plus, Sparkles, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useServices, useUpdateService, useCreateService, useServiceJobStats, SEED_SERVICES, type DbService, type DbServiceUpdate, type ServiceJobStats } from '@/hooks/useServices';
import { useSystems } from '@/hooks/useSystems';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, todayLocal } from '@/lib/utils';

const unitLabel = (u: string) => (u === 'day' ? 'per day' : 'per SF');

const NumField: React.FC<{ label: string; value: number; onSave: (v: number) => void }> = ({ label, value, onSave }) => {
  const [v, setV] = useState(String(value ?? 0));
  React.useEffect(() => setV(String(value ?? 0)), [value]);
  return (
    <label className="space-y-1 block">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <Input type="number" inputMode="decimal" min={0} step="0.01" value={v}
        onChange={e => setV(e.target.value)}
        onBlur={() => { const n = v === '' ? 0 : Number(v); if (!Number.isFinite(n) || n < 0) { setV(String(value)); return; } if (n !== Number(value)) onSave(n); }} />
    </label>
  );
};

const ServiceCard: React.FC<{ s: DbService; systems: { id: string; name: string }[]; stat?: ServiceJobStats }> = ({ s, systems, stat }) => {
  const update = useUpdateService();
  const [name, setName] = useState(s.name);
  React.useEffect(() => setName(s.name), [s.name]);
  const save = (patch: DbServiceUpdate) =>
    update.mutate({ id: s.id, patch }, { onSuccess: () => toast.success('Saved') });

  const applySuggestedRate = () => {
    if (!stat) return;
    save({
      rate_default: stat.avgRate,
      rate_low: stat.minRate,
      rate_high: stat.maxRate,
      rate_reviewed_on: todayLocal(),
    });
    toast.success(`Updated rate to verified average ($${stat.avgRate})`);
  };

  return (
    <div className={cn('rounded-lg border border-border bg-card p-4 space-y-3', !s.is_active && 'opacity-60')}>
      <div className="flex items-start gap-2">
        <Input className="font-serif text-base" value={name} onChange={e => setName(e.target.value)}
          onBlur={() => { const t = name.trim(); if (!t) { setName(s.name); return; } if (t !== s.name) save({ name: t }); }} />
        <div className="flex items-center gap-2 shrink-0 pt-2">
          <span className="text-xs text-muted-foreground">{s.is_active ? 'Active' : 'Inactive'}</span>
          <Switch checked={s.is_active} onCheckedChange={c => save({ is_active: c })} aria-label="Active" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{unitLabel(s.pricing_unit)}</Badge>
        <Badge variant={s.materials_included ? 'default' : 'outline'}>
          {s.materials_included ? 'Materials included' : 'Materials billed separately'}
        </Badge>
        {Number(s.minimum_charge) > 0 && <Badge variant="outline">Min ${Number(s.minimum_charge).toLocaleString()}</Badge>}
      </div>

      {stat && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-2.5 text-[11px] space-y-1.5">
          <div className="flex items-center justify-between text-foreground font-semibold">
            <span className="flex items-center gap-1 text-primary">
              <Sparkles size={12} /> Verified from {stat.count} job{stat.count > 1 ? 's' : ''}
            </span>
            <span>Avg: ${stat.avgRate.toFixed(2)} {unitLabel(s.pricing_unit)}</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Range: ${stat.minRate.toFixed(2)} – ${stat.maxRate.toFixed(2)}</span>
            <button
              type="button"
              onClick={applySuggestedRate}
              className="text-primary hover:underline font-bold inline-flex items-center gap-1"
            >
              <CheckCircle2 size={11} /> Use verified rate
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <NumField label="Low" value={Number(s.rate_low)} onSave={v => save({ rate_low: v })} />
        <NumField label="Default" value={Number(s.rate_default)} onSave={v => save({ rate_default: v })} />
        <NumField label="High" value={Number(s.rate_high)} onSave={v => save({ rate_high: v })} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1 block">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Unit</span>
          <select className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={s.pricing_unit} onChange={e => save({ pricing_unit: e.target.value })}>
            <option value="sf">Per SF</option>
            <option value="day">Per day</option>
          </select>
        </label>
        <NumField label="Minimum charge ($)" value={Number(s.minimum_charge)} onSave={v => save({ minimum_charge: v })} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1 block">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Linked system (margin only)</span>
          <select className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={s.system_id ?? ''} onChange={e => save({ system_id: e.target.value || null })}>
            <option value="">None</option>
            {systems.map(sys => <option key={sys.id} value={sys.id}>{sys.name}</option>)}
          </select>
        </label>
        <label className="space-y-1 block">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Rate reviewed on</span>
          <Input type="date" value={s.rate_reviewed_on ?? ''} onChange={e => save({ rate_reviewed_on: e.target.value || null })} />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Switch checked={s.materials_included} onCheckedChange={c => save({ materials_included: c })} />
        Materials included in rate
      </label>
    </div>
  );
};

const Services: React.FC = () => {
  const { data: services = [], isLoading } = useServices();
  const { data: systems = [] } = useSystems();
  const { data: jobStats = {} } = useServiceJobStats();
  const create = useCreateService();
  const [showInactive, setShowInactive] = useState(true);

  const add = () => create.mutate(
    { name: 'New service', pricing_unit: 'sf', rate_default: 0, rate_low: 0, rate_high: 0, materials_included: false, minimum_charge: 0 },
    { onSuccess: () => toast.success('Service added') },
  );

  const seed = async () => {
    try {
      let added = 0;
      for (const s of SEED_SERVICES) {
        const exists = services.some(existing => existing.name.toLowerCase() === s.name.toLowerCase());
        if (!exists) {
          await create.mutateAsync(s);
          added++;
        }
      }
      if (added === 0) {
        toast.info('All starter services already exist in your price book');
      } else {
        toast.success(`Added ${added} starter service${added > 1 ? 's' : ''} to your price book`);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to seed price book');
    }
  };

  const list = services.filter(s => showInactive || s.is_active);

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl text-foreground">Services</h1>
          <p className="text-xs text-muted-foreground">Your price book — what you charge.</p>
        </div>
        <div className="flex items-center gap-2">
          {services.length < SEED_SERVICES.length && (
            <Button onClick={seed} disabled={create.isPending} variant="outline" size="sm">
              <Sparkles className="h-4 w-4 mr-1 text-primary" />Seed Price Book
            </Button>
          )}
          <Button onClick={add} disabled={create.isPending} size="sm">
            <Plus className="h-4 w-4 mr-1" />Add service
          </Button>
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <Switch checked={showInactive} onCheckedChange={setShowInactive} /> Show inactive
      </label>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : list.length === 0 ? (
        <div className="text-center py-10 bg-card rounded-xl border border-dashed border-border space-y-3">
          <Sparkles className="mx-auto text-primary" size={24} />
          <p className="text-foreground text-sm font-bold">No services in price book yet</p>
          <p className="text-muted-foreground text-[11px] max-w-sm mx-auto">
            Seed Organic Finishes' 2026–2027 regional price book (Limewash @ $5.50/SF, Marmorino @ $16.50/SF, Microcement @ $22–$38/SF, Artisan Day @ $950/day, Night Shifts & Travel).
          </p>
          <Button onClick={seed} disabled={create.isPending} size="sm" className="shadow-glow">
            <Sparkles className="h-4 w-4 mr-1" /> Seed Starter Price Book
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map(s => {
            const stat = jobStats[s.id] || jobStats[s.name];
            return <ServiceCard key={s.id} s={s} systems={systems} stat={stat} />;
          })}
        </div>
      )}
    </div>
  );
};

export default Services;

