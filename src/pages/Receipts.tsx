import { parseLocalDate, todayLocal, daysFromTodayLocal } from '@/lib/utils';
import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Camera, Upload, Search, X, Trash2, ChevronDown, ChevronRight, FolderOpen, Layers, Sparkles, Loader2, Plus } from 'lucide-react';
import { scanReceipt } from '@/lib/receiptScan';
import type { DbReceipt } from '@/hooks/useReceipts';
import { useReceipts, useSaveReceipt, useDeleteReceipt, uploadReceiptImage } from '@/hooks/useReceipts';
import { SignedImage } from '@/components/SignedAsset';
import { useProjects, useSaveProject } from '@/hooks/useProjects';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const RECEIPT_CATEGORIES = [
  { value: 'Materials', label: 'Materials' },
  { value: 'Labor', label: 'Labor' },
  { value: 'Equipment', label: 'Equipment' },
  { value: 'Travel', label: 'Travel' },
  { value: 'Supplies', label: 'Supplies' },
  { value: 'Miscellaneous', label: 'Miscellaneous' },
];

type ViewMode = 'project' | 'category';

const Receipts: React.FC = () => {
  const { user } = useAuth();
  const { data: receipts = [], isLoading } = useReceipts();
  const { data: projects = [] } = useProjects();
  const saveReceipt = useSaveReceipt();
  const deleteReceiptMut = useDeleteReceipt();
  const saveProject = useSaveProject();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('project');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const emptyForm = () => ({
    vendor: '', amount: '', date: todayLocal(),
    category: 'Materials', projectId: '', notes: '', taxDeductible: true,
  });
  const [formData, setFormData] = useState(emptyForm);
  const [editing, setEditing] = useState<DbReceipt | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  type AutoField = 'vendor' | 'amount' | 'date' | 'category';

  const handleOpenAdd = () => {
    setEditing(null);
    setImageFile(null);
    setImagePreview('');
    setScanError('');
    setScanning(false);
    setAutoFilled(new Set());
    setFormData(emptyForm());
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (searchParams.get('scan') === '1' || searchParams.get('add') === '1') {
      handleOpenAdd();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const [autoFilled, setAutoFilled] = useState<Set<AutoField>>(new Set());
  const clearAuto = (f: AutoField) => setAutoFilled(prev => { if (!prev.has(f)) return prev; const n = new Set(prev); n.delete(f); return n; });
  const autoCls = (f: AutoField) => autoFilled.has(f) ? ' ring-1 ring-primary/70 bg-primary/5' : '';
  const AutoTag = ({ f }: { f: AutoField }) => autoFilled.has(f)
    ? <span className="ml-1 inline-flex items-center gap-0.5 text-primary normal-case tracking-normal"><Sparkles size={9} /> auto-filled</span>
    : null;

  const openEdit = (r: DbReceipt) => {
    setEditing(r);
    setFormData({
      vendor: r.vendor || '', amount: String(r.amount ?? ''), date: r.receipt_date,
      category: r.category || 'Miscellaneous', projectId: r.project_id || '', notes: r.notes || '',
      taxDeductible: r.tax_deductible !== false,
    });
    setIsModalOpen(true);
  };

  const filteredReceipts = receipts.filter(r => {
    const matchesSearch = (r.vendor || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || r.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const toggleGroup = (id: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
      void runScan(file);
    }
    e.target.value = '';
  };

  const runScan = async (file: File) => {
    setScanning(true);
    setScanError('');
    setAutoFilled(new Set());
    try {
      const r = await scanReceipt(file);
      const filled = new Set<AutoField>();
      setFormData(prev => {
        const next = { ...prev };
        if (r.vendor) { next.vendor = r.vendor; filled.add('vendor'); }
        if (r.amount != null) { next.amount = r.amount.toFixed(2); filled.add('amount'); }
        if (r.date) { next.date = r.date; filled.add('date'); }
        if (r.category) { next.category = r.category; filled.add('category'); }
        return next;
      });
      setAutoFilled(filled);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Could not read the receipt.');
    } finally {
      setScanning(false);
    }
  };

  const handleAddProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      const result = await saveProject.mutateAsync({ name: newProjectName.trim(), status: 'Active' });
      if (result) setFormData(prev => ({ ...prev, projectId: result.id }));
      setNewProjectName('');
      setShowNewProject(false);
      toast.success('Project created');
    } catch { toast.error('Failed to create project'); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vendor || !formData.amount) return;
    try {
      let imageUrl: string | null = editing?.image_url ?? null;
      if (imageFile && user) {
        imageUrl = await uploadReceiptImage(user.id, imageFile);
      }
      await saveReceipt.mutateAsync({
        id: editing?.id,
        vendor: formData.vendor,
        amount: parseFloat(formData.amount),
        receipt_date: formData.date,
        category: formData.category,
        project_id: formData.projectId || null,
        notes: formData.notes || null,
        image_url: imageUrl,
        tax_deductible: formData.taxDeductible,
      });
      toast.success('Receipt saved');
      handleClose();
    } catch { toast.error('Failed to save receipt'); }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this receipt?')) {
      await deleteReceiptMut.mutateAsync(id);
      toast.success('Receipt deleted');
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setShowNewProject(false);
    setNewProjectName('');
    setImageFile(null);
    setImagePreview('');
    setEditing(null);
    setScanError('');
    setScanning(false);
    setAutoFilled(new Set());
    setFormData(emptyForm());
  };

  const categoryColors: Record<string, string> = {
    Materials: 'bg-primary/10 text-primary border-primary/20',
    Labor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Equipment: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    Travel: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Supplies: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    Miscellaneous: 'bg-muted text-muted-foreground border-border',
  };

  const getProjectName = (projectId?: string | null) => {
    if (!projectId) return 'General';
    return projects.find(p => p.id === projectId)?.name || 'Unknown Project';
  };

  const groupedByProject = () => {
    const groups: Record<string, typeof receipts> = { '': [] };
    projects.forEach(p => { groups[p.id] = []; });
    filteredReceipts.forEach(r => {
      const key = r.project_id || '';
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    return groups;
  };

  const groupedByCategory = () => {
    const groups: Record<string, typeof receipts> = {};
    RECEIPT_CATEGORIES.forEach(c => { groups[c.value] = []; });
    filteredReceipts.forEach(r => {
      const cat = r.category || 'Miscellaneous';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(r);
    });
    return groups;
  };

  const renderReceiptCard = (receipt: typeof receipts[0]) => (
    <div key={receipt.id} role="button" tabIndex={0} onClick={() => openEdit(receipt)}
      onKeyDown={e => { if (e.key === 'Enter') openEdit(receipt); }}
      className="bg-card p-3 rounded-xl border border-border flex items-center gap-3 group cursor-pointer hover:border-primary/40 transition-colors">
      {receipt.image_url && (
        <div className="w-12 h-12 rounded-lg overflow-hidden border border-border flex-shrink-0">
          <SignedImage bucket="receipts" path={receipt.image_url} alt="Receipt" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-foreground font-semibold text-sm truncate">{receipt.vendor}</h3>
          <span className={`text-[8px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-wider ${categoryColors[receipt.category || 'Miscellaneous']}`}>
            {receipt.category}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {parseLocalDate(receipt.receipt_date).toLocaleDateString()}
          {viewMode === 'category' && receipt.project_id && ` • ${getProjectName(receipt.project_id)}`}
          {receipt.notes && ` • ${receipt.notes}`}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="font-serif text-foreground font-bold">${Number(receipt.amount).toFixed(2)}</p>
        <button onClick={(e) => { e.stopPropagation(); handleDelete(receipt.id); }} aria-label="Delete receipt" className="text-destructive/50 hover:text-destructive text-[10px] mt-1">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );

  const renderGroupedView = () => {
    const groups = viewMode === 'project' ? groupedByProject() : groupedByCategory();
    const entries = Object.entries(groups).filter(([, items]) => items.length > 0);

    if (entries.length === 0) {
      return (
        <div className="text-center py-10 bg-card rounded-xl border border-dashed border-border">
          <Camera size={32} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground text-[11px]">No receipts yet. Tap Add to scan one.</p>
        </div>
      );
    }

    return entries.map(([key, items]) => {
      const isCollapsed = collapsedGroups.has(key);
      const total = items.reduce((sum, r) => sum + Number(r.amount), 0);
      const label = viewMode === 'project'
        ? (key === '' ? 'General' : getProjectName(key))
        : RECEIPT_CATEGORIES.find(c => c.value === key)?.label || key;

      return (
        <div key={key} className="space-y-1.5">
          <button onClick={() => toggleGroup(key)}
            className="w-full flex items-center justify-between p-2.5 bg-secondary/50 rounded-xl border border-border hover:bg-secondary/80 transition-all">
            <div className="flex items-center gap-2">
              {isCollapsed ? <ChevronRight size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
              <span className="text-foreground font-semibold text-xs">{label}</span>
              <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{items.length}</span>
            </div>
            <span className="font-serif text-foreground text-sm font-bold">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </button>
          {!isCollapsed && (
            <div className="space-y-1.5 pl-2">
              {items.map(renderReceiptCard)}
            </div>
          )}
        </div>
      );
    });
  };

  if (isLoading) return <div className="text-center py-20 text-muted-foreground text-sm">Loading receipts...</div>;

  return (
    <div className="space-y-4 animate-fade-in pb-20 max-w-5xl mx-auto">
      <header className="flex justify-between items-center gap-2">
        <div>
          <h2 className="text-xl font-serif text-foreground tracking-tight">Receipts</h2>
          <p className="text-muted-foreground text-[9px] uppercase tracking-widest mt-0.5 font-bold">Expense Tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              handleOpenAdd();
              cameraInputRef.current?.click();
            }}
            className="bg-primary text-primary-foreground px-3.5 py-2 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-glow flex items-center gap-1.5 hover:bg-primary/90 transition-all"
            title="Open phone camera to snap and scan receipt"
          >
            <Camera size={14} /> Scan Camera
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="bg-card border border-border text-foreground hover:bg-accent px-3 py-2 rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center gap-1.5 transition-all"
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </header>

      {/* Hidden file inputs mounted permanently so camera/file triggers work anywhere */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageCapture} />
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageCapture} />

      {receipts.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card p-3 rounded-xl border border-border text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Total</p>
            <p className="font-serif text-foreground text-lg mt-1">${receipts.reduce((s, r) => s + Number(r.amount), 0).toLocaleString()}</p>
          </div>
          <div className="bg-card p-3 rounded-xl border border-border text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Receipts</p>
            <p className="font-serif text-foreground text-lg mt-1">{receipts.length}</p>
          </div>
          <div className="bg-card p-3 rounded-xl border border-border text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Projects</p>
            <p className="font-serif text-foreground text-lg mt-1">{new Set(receipts.map(r => r.project_id).filter(Boolean)).size}</p>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <input type="text" placeholder="Search vendors..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-card border border-border rounded-xl py-2.5 pl-12 pr-4 text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground text-[12px]" />
      </div>

      <div className="flex items-center gap-2">
        <div className="flex bg-card border border-border rounded-lg overflow-hidden">
          <button onClick={() => setViewMode('project')}
            className={`px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 transition-all ${
              viewMode === 'project' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}><FolderOpen size={12} /> Project</button>
          <button onClick={() => setViewMode('category')}
            className={`px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 transition-all ${
              viewMode === 'category' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}><Layers size={12} /> Category</button>
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar flex-1">
          <button onClick={() => setCategoryFilter('all')}
            className={`px-2.5 py-1.5 rounded-full text-[9px] font-bold tracking-widest uppercase whitespace-nowrap transition-all ${
              categoryFilter === 'all' ? 'bg-primary text-primary-foreground shadow-glow' : 'bg-card border border-border text-muted-foreground'
            }`}>All</button>
          {RECEIPT_CATEGORIES.map(cat => (
            <button key={cat.value} onClick={() => setCategoryFilter(cat.value)}
              className={`px-2.5 py-1.5 rounded-full text-[9px] font-bold tracking-widest uppercase whitespace-nowrap transition-all ${
                categoryFilter === cat.value ? 'bg-primary text-primary-foreground shadow-glow' : 'bg-card border border-border text-muted-foreground'
              }`}>{cat.label}</button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {renderGroupedView()}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-soft">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h3 className="text-lg font-serif text-foreground">{editing ? 'Edit Receipt' : 'Add Receipt'}</h3>
              <button onClick={handleClose} className="text-muted-foreground hover:text-foreground p-1.5 hover:bg-accent rounded-full"><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3 max-h-[70vh] overflow-y-auto no-scrollbar">
              <div className="flex gap-2">
                <button type="button" onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-accent border border-border rounded-xl text-foreground text-[10px] font-bold uppercase tracking-widest hover:bg-primary/10 transition-all">
                  <Camera size={16} /> Camera
                </button>
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-accent border border-border rounded-xl text-foreground text-[10px] font-bold uppercase tracking-widest hover:bg-primary/10 transition-all">
                  <Upload size={16} /> Upload
                </button>
              </div>

              {scanning && (
                <p className="flex items-center gap-1.5 text-[11px] text-primary"><Loader2 size={12} className="animate-spin" /> Reading receipt…</p>
              )}
              {scanError && !scanning && (
                <p className="text-[11px] text-destructive">{scanError} Fill in the details yourself.</p>
              )}
              {!imagePreview && editing?.image_url && (
                <div className="rounded-xl overflow-hidden border border-border">
                  <SignedImage bucket="receipts" path={editing.image_url} alt="Receipt" className="w-full h-40 object-cover" />
                </div>
              )}
              {imagePreview && (
                <div className="relative rounded-xl overflow-hidden border border-border">
                  <img src={imagePreview} alt="Receipt preview" className="w-full h-40 object-cover" />
                  <button type="button" onClick={() => { setImageFile(null); setImagePreview(''); }}
                    className="absolute top-2 right-2 bg-background/80 p-1 rounded-full text-destructive"><X size={14} /></button>
                </div>
              )}

              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Project</label>
                {!showNewProject ? (
                  <div className="flex gap-2">
                    <select value={formData.projectId} onChange={e => setFormData({ ...formData, projectId: e.target.value })}
                      className="flex-1 bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none">
                      <option value="">General (No Project)</option>
                      {projects.filter(p => p.status === 'Active').map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => setShowNewProject(true)}
                      className="px-3 bg-accent border border-border rounded-lg text-foreground text-[10px] font-bold uppercase tracking-widest hover:bg-primary/10 transition-all">+ New</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input type="text" placeholder="Project name..." value={newProjectName}
                      onChange={e => setNewProjectName(e.target.value)}
                      className="flex-1 bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary" />
                    <button type="button" onClick={handleAddProject} disabled={saveProject.isPending}
                      className="px-3 bg-primary text-primary-foreground rounded-lg text-[10px] font-bold uppercase tracking-widest disabled:opacity-50">Add</button>
                    <button type="button" onClick={() => { setShowNewProject(false); setNewProjectName(''); }}
                      className="px-2 text-muted-foreground hover:text-foreground"><X size={14} /></button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Vendor / Store<AutoTag f="vendor" /></label>
                <input required type="text" value={formData.vendor} onChange={e => { clearAuto('vendor'); setFormData({ ...formData, vendor: e.target.value }); }}
                  className={`w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary${autoCls('vendor')}`} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Amount ($)<AutoTag f="amount" /></label>
                  <input required type="number" step="0.01" value={formData.amount} onChange={e => { clearAuto('amount'); setFormData({ ...formData, amount: e.target.value }); }}
                    className={`w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary${autoCls('amount')}`} />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Date<AutoTag f="date" /></label>
                  <input type="date" value={formData.date} onChange={e => { clearAuto('date'); setFormData({ ...formData, date: e.target.value }); }}
                    className={`w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary${autoCls('date')}`} />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Category<AutoTag f="category" /></label>
                <select value={formData.category} onChange={e => { clearAuto('category'); setFormData({ ...formData, category: e.target.value }); }}
                  className={`w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none${autoCls('category')}`}>
                  {RECEIPT_CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Notes</label>
                <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none h-16 resize-none" />
              </div>

              <label className="flex items-center justify-between bg-accent border border-border rounded-lg p-2.5 cursor-pointer">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tax deductible</span>
                <button type="button" role="switch" aria-checked={formData.taxDeductible} aria-label="Tax deductible"
                  onClick={() => setFormData({ ...formData, taxDeductible: !formData.taxDeductible })}
                  className={`relative h-5 w-9 rounded-full transition-colors ${formData.taxDeductible ? 'bg-primary' : 'bg-muted'}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-background transition-transform ${formData.taxDeductible ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </label>

              <div className="pt-2 flex gap-2 justify-end">
                <button type="button" onClick={handleClose} className="px-4 py-2 rounded-lg text-muted-foreground font-bold text-[10px] uppercase tracking-widest">Cancel</button>
                <button type="submit" disabled={saveReceipt.isPending || scanning}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-glow disabled:opacity-50">
                  {saveReceipt.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Receipts;
