import React, { useState } from 'react';
import { Plus, Pencil, Trash2, X, Sparkles } from 'lucide-react';
import { useSystems, useSaveSystem, useDeleteSystem, SEED_SYSTEMS, type DbSystem } from '@/hooks/useSystems';
import { toast } from 'sonner';

const empty: Partial<DbSystem> = {
  name: '', manufacturer: '', description: '', coats: 2,
  coverage_rate: undefined, coverage_unit: 'gal',
  cost_per_unit: undefined, labor_rate_per_sf: undefined,
  typical_equipment: '', substrate_notes: '', application_notes: '',
  is_active: true,
};

const Systems: React.FC = () => {
  const { data: systems = [], isLoading } = useSystems();
  const saveSystem = useSaveSystem();
  const deleteSystem = useDeleteSystem();
  const [editing, setEditing] = useState<Partial<DbSystem> | null>(null);

  const seed = async () => {
    try {
      for (const s of SEED_SYSTEMS) await saveSystem.mutateAsync(s);
      toast.success('Seeded 4 starter systems');
    } catch { toast.error('Failed to seed'); }
  };

  const save = async () => {
    if (!editing?.name) { toast.error('Name required'); return; }
    try {
      await saveSystem.mutateAsync(editing as any);
      toast.success('System saved');
      setEditing(null);
    } catch { toast.error('Save failed'); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this system?')) return;
    try { await deleteSystem.mutateAsync(id); toast.success('Deleted'); } catch { toast.error('Delete failed'); }
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-serif text-foreground">Systems Library</h2>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">AI uses these to estimate</p>
        </div>
        <button onClick={() => setEditing({ ...empty })}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-glow">
          <Plus size={14} /> New
        </button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-[11px]">Loading…</p>
      ) : systems.length === 0 ? (
        <div className="text-center py-10 bg-card rounded-xl border border-dashed border-border space-y-3">
          <Sparkles className="mx-auto text-primary" size={24} />
          <p className="text-foreground text-sm font-bold">No systems yet</p>
          <p className="text-muted-foreground text-[11px]">Seed 4 starter systems (Biolime, Bauwerks, paint, Venetian).</p>
          <button onClick={seed} disabled={saveSystem.isPending}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-glow disabled:opacity-50">
            {saveSystem.isPending ? 'Seeding…' : 'Seed Starter Systems'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {systems.map((s) => (
            <div key={s.id} className="bg-card border border-border rounded-xl p-3 space-y-1.5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-foreground text-sm">{s.name}</h3>
                  <p className="text-[10px] text-muted-foreground">{s.manufacturer} · {s.coats} coats</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditing(s)} className="p-1.5 hover:bg-accent rounded text-muted-foreground"><Pencil size={12} /></button>
                  <button onClick={() => remove(s.id)} className="p-1.5 hover:bg-accent rounded text-destructive"><Trash2 size={12} /></button>
                </div>
              </div>
              {s.description && <p className="text-[10px] text-foreground/80">{s.description}</p>}
              <div className="grid grid-cols-2 gap-1 text-[10px] pt-1 border-t border-border">
                <Stat label="Coverage" value={`${s.coverage_rate ?? '—'} SF/${s.coverage_unit ?? ''}`} />
                <Stat label="Cost" value={s.cost_per_unit != null ? `$${s.cost_per_unit}/${s.coverage_unit}` : '—'} />
                <Stat label="Labor" value={s.labor_rate_per_sf != null ? `$${s.labor_rate_per_sf}/SF` : '—'} />
                <Stat label="Substrate" value={s.substrate_notes || '—'} />
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-background border border-border rounded-2xl p-4 max-w-lg w-full max-h-[90vh] overflow-y-auto no-scrollbar" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-serif text-foreground">{editing.id ? 'Edit System' : 'New System'}</h3>
              <button onClick={() => setEditing(null)} className="text-muted-foreground"><X size={16} /></button>
            </div>
            <div className="space-y-2 text-[11px]">
              <Field label="Name *" value={editing.name ?? ''} onChange={(v) => setEditing({ ...editing, name: v })} />
              <Field label="Manufacturer" value={editing.manufacturer ?? ''} onChange={(v) => setEditing({ ...editing, manufacturer: v })} />
              <Field label="Description" value={editing.description ?? ''} onChange={(v) => setEditing({ ...editing, description: v })} multiline />
              <div className="grid grid-cols-3 gap-2">
                <Field label="Coats" type="number" value={String(editing.coats ?? '')} onChange={(v) => setEditing({ ...editing, coats: Number(v) || 0 })} />
                <Field label="Coverage" type="number" value={String(editing.coverage_rate ?? '')} onChange={(v) => setEditing({ ...editing, coverage_rate: Number(v) || 0 })} />
                <Field label="Unit" value={editing.coverage_unit ?? ''} onChange={(v) => setEditing({ ...editing, coverage_unit: v })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Cost/unit ($)" type="number" value={String(editing.cost_per_unit ?? '')} onChange={(v) => setEditing({ ...editing, cost_per_unit: Number(v) || 0 })} />
                <Field label="Labor $/SF" type="number" value={String(editing.labor_rate_per_sf ?? '')} onChange={(v) => setEditing({ ...editing, labor_rate_per_sf: Number(v) || 0 })} />
              </div>
              <Field label="Typical equipment" value={editing.typical_equipment ?? ''} onChange={(v) => setEditing({ ...editing, typical_equipment: v })} />
              <Field label="Substrate notes" value={editing.substrate_notes ?? ''} onChange={(v) => setEditing({ ...editing, substrate_notes: v })} />
              <Field label="Application notes" value={editing.application_notes ?? ''} onChange={(v) => setEditing({ ...editing, application_notes: v })} multiline />
            </div>
            <button onClick={save} disabled={saveSystem.isPending}
              className="mt-3 w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-glow disabled:opacity-50">
              {saveSystem.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div><span className="text-muted-foreground">{label}: </span><span className="text-foreground">{value}</span></div>
);

const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void; type?: string; multiline?: boolean }> = ({ label, value, onChange, type, multiline }) => (
  <div>
    <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{label}</label>
    {multiline ? (
      <textarea value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-card border border-border rounded-lg p-2 text-foreground text-[11px] outline-none focus:ring-1 focus:ring-primary resize-none h-16" />
    ) : (
      <input type={type ?? 'text'} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-card border border-border rounded-lg py-1.5 px-2 text-foreground text-[11px] outline-none focus:ring-1 focus:ring-primary" />
    )}
  </div>
);

export default Systems;
