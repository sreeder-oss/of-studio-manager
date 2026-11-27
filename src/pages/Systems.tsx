import React, { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, X, Sparkles, Search, FileText, Info, Layers, Check, Palette } from 'lucide-react';
import { useSystems, useSaveSystem, useDeleteSystem, SEED_SYSTEMS, type DbSystem } from '@/hooks/useSystems';
import { getSwatchesForSystem } from '@/data/colorCatalog';
import { toast } from 'sonner';

const empty: Partial<DbSystem> = {
  name: '', manufacturer: '', description: '', coats: 2,
  coverage_rate: undefined, coverage_unit: 'gal',
  cost_per_unit: undefined, labor_rate_per_sf: undefined,
  typical_equipment: '', substrate_notes: '', application_notes: '',
  prep_tier_notes: '', waste_factor: 0.10, sundries_pct: 0.05, min_charge: undefined,
  is_active: true,
};

const Systems: React.FC = () => {
  const { data: systems = [], isLoading } = useSystems();
  const saveSystem = useSaveSystem();
  const deleteSystem = useDeleteSystem();
  const [editing, setEditing] = useState<Partial<DbSystem> | null>(null);
  const [viewingTds, setViewingTds] = useState<DbSystem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = useMemo(() => {
    const list = [
      { id: 'all', label: 'All Systems', count: systems.length },
      { id: 'surecrete', label: 'SureCrete', count: systems.filter(s => (s.manufacturer || '').toLowerCase().includes('surecrete')).length },
      { id: 'meoded', label: 'Meoded', count: systems.filter(s => (s.manufacturer || '').toLowerCase().includes('meoded')).length },
      { id: 'romabio', label: 'Romabio', count: systems.filter(s => (s.manufacturer || '').toLowerCase().includes('romabio')).length },
      { id: 'other', label: 'Other', count: systems.filter(s => {
        const m = (s.manufacturer || '').toLowerCase();
        return !m.includes('surecrete') && !m.includes('meoded') && !m.includes('romabio');
      }).length },
    ];
    return list;
  }, [systems]);

  const filteredSystems = useMemo(() => {
    return systems.filter(s => {
      const m = (s.manufacturer || '').toLowerCase();
      const matchCat =
        selectedCategory === 'all' ? true :
        selectedCategory === 'surecrete' ? m.includes('surecrete') :
        selectedCategory === 'meoded' ? m.includes('meoded') :
        selectedCategory === 'romabio' ? m.includes('romabio') :
        !m.includes('surecrete') && !m.includes('meoded') && !m.includes('romabio');

      if (!matchCat) return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        s.name.toLowerCase().includes(term) ||
        (s.manufacturer || '').toLowerCase().includes(term) ||
        (s.description || '').toLowerCase().includes(term) ||
        (s.substrate_notes || '').toLowerCase().includes(term) ||
        (s.application_notes || '').toLowerCase().includes(term) ||
        (s.typical_equipment || '').toLowerCase().includes(term)
      );
    });
  }, [systems, selectedCategory, searchTerm]);

  const seed = async () => {
    try {
      let added = 0;
      for (const s of SEED_SYSTEMS) {
        const exists = systems.some(existing => existing.name.toLowerCase() === s.name.toLowerCase());
        if (!exists) {
          await saveSystem.mutateAsync(s);
          added++;
        }
      }
      if (added === 0) {
        toast.info(`All ${SEED_SYSTEMS.length} starter systems already exist in your library`);
      } else {
        toast.success(`Successfully added ${added} manufacturer systems to your library`);
      }
    } catch {
      toast.error('Failed to sync systems');
    }
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
    <div className="space-y-4 animate-fade-in max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-serif text-foreground">Systems Library</h2>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            Manufacturer technical data, coverage rates & application specs for AI estimating
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={seed}
            disabled={saveSystem.isPending}
            className="flex items-center gap-1.5 bg-accent hover:bg-accent/80 border border-border text-foreground px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm disabled:opacity-50"
            title="Sync official SureCrete & Meoded starter specifications"
          >
            <Sparkles size={13} className="text-primary" />
            {saveSystem.isPending ? 'Syncing…' : 'Seed / Sync Library'}
          </button>
          <button
            onClick={() => setEditing({ ...empty })}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-glow"
          >
            <Plus size={14} /> New
          </button>
        </div>
      </div>

      {/* Search & Categories Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search systems, manufacturers, substrates, or TDS specs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto no-scrollbar py-0.5">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {cat.label} ({cat.count})
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-xs py-8 text-center">Loading systems library…</p>
      ) : systems.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-2xl border border-dashed border-border space-y-3">
          <Sparkles className="mx-auto text-primary" size={28} />
          <h3 className="text-foreground text-sm font-bold">No systems in library yet</h3>
          <p className="text-muted-foreground text-xs max-w-md mx-auto">
            Populate your library with 16 verified specifications for SureCrete (SureBroom, MicroTek, DK 400WB, HS 300, DK 700) and Meoded (Quartz Primer, Tintoretto, Palladino, Golmex, Stucco Veneziano, Hydrowax).
          </p>
          <button
            onClick={seed}
            disabled={saveSystem.isPending}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-glow disabled:opacity-50"
          >
            {saveSystem.isPending ? 'Seeding…' : 'Seed 16 Manufacturer Systems'}
          </button>
        </div>
      ) : filteredSystems.length === 0 ? (
        <div className="text-center py-10 bg-card rounded-xl border border-border">
          <p className="text-foreground text-sm font-bold">No matching systems found</p>
          <p className="text-muted-foreground text-xs mt-1">Try clearing your search query or switching tabs.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredSystems.map((s) => (
            <div key={s.id} className="bg-card border border-border rounded-xl p-3.5 space-y-2.5 flex flex-col justify-between hover:border-primary/40 transition-colors">
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-foreground text-sm leading-snug">{s.name}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        {s.manufacturer || 'Custom'}
                      </span>
                      <span className="text-[10px] text-muted-foreground">· {s.coats ?? 1} coat{(s.coats ?? 1) > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => setViewingTds(s)}
                      className="p-1.5 hover:bg-accent rounded-md text-primary"
                      title="View Technical Data Sheet & Application Specs"
                    >
                      <Info size={14} />
                    </button>
                    <button onClick={() => setEditing(s)} className="p-1.5 hover:bg-accent rounded-md text-muted-foreground"><Pencil size={13} /></button>
                    <button onClick={() => remove(s.id)} className="p-1.5 hover:bg-accent rounded-md text-destructive"><Trash2 size={13} /></button>
                  </div>
                </div>

                {s.description && (
                  <p className="text-xs text-foreground/80 line-clamp-2 leading-relaxed">{s.description}</p>
                )}
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
                  <Stat label="Coverage" value={s.coverage_rate ? `${s.coverage_rate} SF/${s.coverage_unit || 'unit'}` : '—'} />
                  <Stat label="Material Cost" value={s.cost_per_unit != null ? `$${s.cost_per_unit}/${s.coverage_unit || 'unit'}` : '—'} />
                  <Stat label="Labor Rate" value={s.labor_rate_per_sf != null ? `$${s.labor_rate_per_sf}/SF` : '—'} />
                  <Stat label="Min Charge" value={s.min_charge != null ? `$${s.min_charge}` : '—'} />
                </div>

                <div className="flex items-center justify-between pt-1 text-[10px]">
                  <span className="text-muted-foreground truncate max-w-[200px]" title={s.substrate_notes || ''}>
                    Substrate: <span className="text-foreground">{s.substrate_notes || 'Standard'}</span>
                  </span>
                  <button
                    onClick={() => setViewingTds(s)}
                    className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 shrink-0"
                  >
                    <FileText size={11} /> View TDS Specs
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TDS & Technical Specs Modal */}
      {viewingTds && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-fade-in" onClick={() => setViewingTds(null)}>
          <div className="bg-background border border-border rounded-2xl p-5 max-w-xl w-full max-h-[85vh] overflow-y-auto no-scrollbar space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start border-b border-border pb-3">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {viewingTds.manufacturer || 'Specialty System'} Technical Specification
                </span>
                <h3 className="text-base font-serif font-bold text-foreground mt-1">{viewingTds.name}</h3>
              </div>
              <button onClick={() => setViewingTds(null)} className="text-muted-foreground hover:text-foreground p-1"><X size={18} /></button>
            </div>

            {viewingTds.description && (
              <div className="space-y-1">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">System Summary</p>
                <p className="text-xs text-foreground leading-relaxed bg-card p-3 rounded-xl border border-border">{viewingTds.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-card p-3 rounded-xl border border-border text-center">
              <div>
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Coverage</p>
                <p className="text-xs font-bold text-foreground mt-0.5">{viewingTds.coverage_rate ?? '—'} SF/{viewingTds.coverage_unit ?? ''}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Coats</p>
                <p className="text-xs font-bold text-foreground mt-0.5">{viewingTds.coats ?? 1}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Material Cost</p>
                <p className="text-xs font-bold text-foreground mt-0.5">${viewingTds.cost_per_unit ?? 0}/{viewingTds.coverage_unit ?? 'unit'}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Labor Rate</p>
                <p className="text-xs font-bold text-foreground mt-0.5">${viewingTds.labor_rate_per_sf ?? 0}/SF</p>
              </div>
            </div>

            {viewingTds.substrate_notes && (
              <div className="space-y-1">
                <p className="text-[9px] font-bold uppercase tracking-widest text-primary">Substrate Prep & Surface Profile (CSP)</p>
                <div className="text-xs text-foreground/90 bg-accent/40 p-3 rounded-xl border border-border leading-relaxed whitespace-pre-line">
                  {viewingTds.substrate_notes}
                </div>
              </div>
            )}

            {viewingTds.application_notes && (
              <div className="space-y-1">
                <p className="text-[9px] font-bold uppercase tracking-widest text-primary">Application Notes, Mixing Ratios & Cure Intervals</p>
                <div className="text-xs text-foreground/90 bg-accent/40 p-3 rounded-xl border border-border leading-relaxed whitespace-pre-line">
                  {viewingTds.application_notes}
                </div>
              </div>
            )}

            {viewingTds.typical_equipment && (
              <div className="space-y-1">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Typical Equipment & Containment</p>
                <p className="text-xs text-foreground bg-card p-2.5 rounded-lg border border-border">{viewingTds.typical_equipment}</p>
              </div>
            )}

            {viewingTds.prep_tier_notes && (
              <div className="space-y-1">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Prep Tier Guidelines (Light / Standard / Heavy)</p>
                <p className="text-xs text-foreground bg-card p-2.5 rounded-lg border border-border">{viewingTds.prep_tier_notes}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground pt-1">
              <div>Waste Factor: <span className="font-bold text-foreground">{((viewingTds.waste_factor ?? 0.1) * 100).toFixed(0)}%</span></div>
              <div>Sundries: <span className="font-bold text-foreground">{((viewingTds.sundries_pct ?? 0.05) * 100).toFixed(0)}%</span></div>
              <div>Min Charge: <span className="font-bold text-foreground">${viewingTds.min_charge ?? 'None'}</span></div>
            </div>

            {(() => {
              const swatches = getSwatchesForSystem(viewingTds.manufacturer, viewingTds.name);
              if (swatches.length === 0) return null;
              const lightMedOnly = viewingTds.name.toLowerCase().includes('lime slurry');
              return (
                <div className="rounded-xl border border-border bg-card/70 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#d9a441] flex items-center gap-1.5">
                      <Palette size={12} /> Factory Stock Palette ({swatches.length})
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-background border border-border text-muted-foreground">
                      {lightMedOnly ? 'Light-to-Medium Bases Only' : 'Native Mineral Swatches'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {swatches.map((sw) => (
                      <div key={sw.id} className="flex items-center gap-2 p-1.5 rounded-lg bg-background/70 border border-border/70">
                        <span
                          className="h-6 w-6 rounded-md border border-black/20 shrink-0"
                          style={{ backgroundColor: sw.hex }}
                        />
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold text-foreground truncate">{sw.name}</p>
                          <p className="text-[9px] font-mono text-muted-foreground truncate">{sw.code} · LRV {sw.lrvApprox}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => { const toEdit = viewingTds; setViewingTds(null); setEditing(toEdit); }}
                className="bg-accent hover:bg-accent/80 border border-border text-foreground px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest"
              >
                Edit Specification
              </button>
              <button
                onClick={() => setViewingTds(null)}
                className="bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-glow"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / New System Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-fade-in" onClick={() => setEditing(null)}>
          <div className="bg-background border border-border rounded-2xl p-4 max-w-lg w-full max-h-[90vh] overflow-y-auto no-scrollbar space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-border pb-2.5">
              <h3 className="font-serif text-foreground font-bold">{editing.id ? 'Edit System Specification' : 'New System Specification'}</h3>
              <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
            </div>
            <div className="space-y-2 text-[11px]">
              <Field label="System Name *" value={editing.name ?? ''} onChange={(v) => setEditing({ ...editing, name: v })} placeholder="e.g. SureCrete SureBroom Resurfacing System" />
              <Field label="Manufacturer" value={editing.manufacturer ?? ''} onChange={(v) => setEditing({ ...editing, manufacturer: v })} placeholder="SureCrete, Meoded, Vasari, etc." />
              <Field label="Description" value={editing.description ?? ''} onChange={(v) => setEditing({ ...editing, description: v })} multiline placeholder="Overview of the system, performance properties, and finish aesthetic..." />
              <div className="grid grid-cols-3 gap-2">
                <Field label="Coats" type="number" value={String(editing.coats ?? '')} onChange={(v) => setEditing({ ...editing, coats: Number(v) || 0 })} />
                <Field label="Coverage (SF/unit)" type="number" value={String(editing.coverage_rate ?? '')} onChange={(v) => setEditing({ ...editing, coverage_rate: Number(v) || 0 })} />
                <Field label="Unit" value={editing.coverage_unit ?? ''} onChange={(v) => setEditing({ ...editing, coverage_unit: v })} placeholder="bag, gal, pail" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Cost / unit ($)" type="number" value={String(editing.cost_per_unit ?? '')} onChange={(v) => setEditing({ ...editing, cost_per_unit: Number(v) || 0 })} />
                <Field label="Labor $/SF" type="number" value={String(editing.labor_rate_per_sf ?? '')} onChange={(v) => setEditing({ ...editing, labor_rate_per_sf: Number(v) || 0 })} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Waste %" type="number" value={editing.waste_factor != null ? String(+(Number(editing.waste_factor) * 100).toFixed(2)) : '10'} onChange={(v) => setEditing({ ...editing, waste_factor: (Number(v) || 0) / 100 })} />
                <Field label="Sundries %" type="number" value={editing.sundries_pct != null ? String(+(Number(editing.sundries_pct) * 100).toFixed(2)) : '5'} onChange={(v) => setEditing({ ...editing, sundries_pct: (Number(v) || 0) / 100 })} />
                <Field label="Min charge ($)" type="number" value={String(editing.min_charge ?? '')} onChange={(v) => setEditing({ ...editing, min_charge: v === '' ? null : Number(v) || 0 })} />
              </div>
              <Field label="Substrate Prep & CSP Notes" value={editing.substrate_notes ?? ''} onChange={(v) => setEditing({ ...editing, substrate_notes: v })} multiline placeholder="ICRI CSP profile, moisture vapor limit, primers, etching instructions..." />
              <Field label="Application & Mixing Notes (TDS)" value={editing.application_notes ?? ''} onChange={(v) => setEditing({ ...editing, application_notes: v })} multiline placeholder="Water demand per bag, mixing duration, trowel passes, dry times, cure before sealing..." />
              <Field label="Typical Equipment" value={editing.typical_equipment ?? ''} onChange={(v) => setEditing({ ...editing, typical_equipment: v })} placeholder="Trowels, HEPA sander, brooms, sprayers, mixers..." />
              <Field label="Prep Tier Notes" value={editing.prep_tier_notes ?? ''} onChange={(v) => setEditing({ ...editing, prep_tier_notes: v })} placeholder="Light / Standard / Heavy guidance..." />
            </div>
            <button onClick={save} disabled={saveSystem.isPending}
              className="mt-3 w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-glow disabled:opacity-50">
              {saveSystem.isPending ? 'Saving…' : 'Save System'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div><span className="text-muted-foreground">{label}: </span><span className="font-semibold text-foreground">{value}</span></div>
);

const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void; type?: string; multiline?: boolean; placeholder?: string }> = ({ label, value, onChange, type, multiline, placeholder }) => (
  <div>
    <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{label}</label>
    {multiline ? (
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-card border border-border rounded-lg p-2 text-foreground text-[11px] outline-none focus:ring-1 focus:ring-primary resize-none h-16 placeholder:text-muted-foreground/60" />
    ) : (
      <input type={type ?? 'text'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-card border border-border rounded-lg py-1.5 px-2 text-foreground text-[11px] outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60" />
    )}
  </div>
);

export default Systems;

