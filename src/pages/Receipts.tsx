import React, { useState, useRef } from 'react';
import { Camera, Upload, Search, X, Trash2, ChevronDown, ChevronRight, FolderOpen, LayoutGrid, Layers } from 'lucide-react';
import { Receipt, ReceiptCategory, RECEIPT_CATEGORIES, Project } from '@/types';
import { getReceipts, saveReceipt, deleteReceipt, getProjects, saveProject } from '@/services/storage';

type ViewMode = 'project' | 'category';

const Receipts: React.FC = () => {
  const [receipts, setReceipts] = useState<Receipt[]>(getReceipts());
  const [projects, setProjects] = useState<Project[]>(getProjects());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ReceiptCategory | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('project');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    vendor: '', amount: '', date: new Date().toISOString().split('T')[0],
    category: 'materials' as ReceiptCategory, projectId: '', notes: '', imageUrl: ''
  });

  const refresh = () => { setReceipts(getReceipts()); setProjects(getProjects()); };

  const filteredReceipts = receipts.filter(r => {
    const matchesSearch = r.vendor.toLowerCase().includes(searchTerm.toLowerCase());
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
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleAddProject = () => {
    if (!newProjectName.trim()) return;
    const project: Project = {
      id: `p-${Date.now()}`, name: newProjectName.trim(), status: 'active',
      color: '#49a33d', createdAt: new Date().toISOString()
    };
    saveProject(project);
    setFormData(prev => ({ ...prev, projectId: project.id }));
    setNewProjectName('');
    setShowNewProject(false);
    refresh();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vendor || !formData.amount) return;
    saveReceipt({
      id: `r-${Date.now()}`, vendor: formData.vendor, amount: parseFloat(formData.amount),
      date: formData.date, category: formData.category, projectId: formData.projectId || undefined,
      notes: formData.notes, imageUrl: formData.imageUrl, createdAt: new Date().toISOString()
    });
    refresh();
    handleClose();
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this receipt?')) { deleteReceipt(id); refresh(); }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setShowNewProject(false);
    setNewProjectName('');
    setFormData({ vendor: '', amount: '', date: new Date().toISOString().split('T')[0], category: 'materials', projectId: '', notes: '', imageUrl: '' });
  };

  const categoryColors: Record<string, string> = {
    materials: 'bg-primary/10 text-primary border-primary/20',
    labor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    equipment: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    travel: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    supplies: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    miscellaneous: 'bg-muted text-muted-foreground border-border',
  };

  const getProjectName = (projectId?: string) => {
    if (!projectId) return 'General';
    return projects.find(p => p.id === projectId)?.name || 'Unknown Project';
  };

  const groupedByProject = () => {
    const groups: Record<string, Receipt[]> = { '': [] };
    projects.forEach(p => { groups[p.id] = []; });
    filteredReceipts.forEach(r => {
      const key = r.projectId || '';
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    return groups;
  };

  const groupedByCategory = () => {
    const groups: Record<string, Receipt[]> = {};
    RECEIPT_CATEGORIES.forEach(c => { groups[c.value] = []; });
    filteredReceipts.forEach(r => {
      if (!groups[r.category]) groups[r.category] = [];
      groups[r.category].push(r);
    });
    return groups;
  };

  const renderReceiptCard = (receipt: Receipt) => (
    <div key={receipt.id} className="bg-card p-3 rounded-xl border border-border flex items-center gap-3 group">
      {receipt.imageUrl && (
        <div className="w-12 h-12 rounded-lg overflow-hidden border border-border flex-shrink-0">
          <img src={receipt.imageUrl} alt="Receipt" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-foreground font-semibold text-sm truncate">{receipt.vendor}</h3>
          <span className={`text-[8px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-wider ${categoryColors[receipt.category]}`}>
            {receipt.category}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {new Date(receipt.date).toLocaleDateString()}
          {viewMode === 'category' && receipt.projectId && ` • ${getProjectName(receipt.projectId)}`}
          {receipt.notes && ` • ${receipt.notes}`}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="font-serif text-foreground font-bold">${receipt.amount.toFixed(2)}</p>
        <button onClick={() => handleDelete(receipt.id)} className="text-destructive/50 hover:text-destructive text-[10px] mt-1">
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
      const total = items.reduce((sum, r) => sum + r.amount, 0);
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

  return (
    <div className="space-y-4 animate-fade-in pb-20 max-w-2xl mx-auto">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-serif text-foreground tracking-tight">Receipts</h2>
          <p className="text-muted-foreground text-[9px] uppercase tracking-widest mt-0.5 font-bold">Expense Tracking</p>
        </div>
        <button onClick={() => setIsModalOpen(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-glow flex items-center gap-1.5">
          <Camera size={14} /> Add
        </button>
      </header>

      {/* Summary cards */}
      {receipts.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card p-3 rounded-xl border border-border text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Total</p>
            <p className="font-serif text-foreground text-lg mt-1">${receipts.reduce((s, r) => s + r.amount, 0).toLocaleString()}</p>
          </div>
          <div className="bg-card p-3 rounded-xl border border-border text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Receipts</p>
            <p className="font-serif text-foreground text-lg mt-1">{receipts.length}</p>
          </div>
          <div className="bg-card p-3 rounded-xl border border-border text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Projects</p>
            <p className="font-serif text-foreground text-lg mt-1">{new Set(receipts.map(r => r.projectId).filter(Boolean)).size}</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <input type="text" placeholder="Search vendors..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-card border border-border rounded-xl py-2.5 pl-12 pr-4 text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground text-[12px]" />
      </div>

      {/* View toggle + category filters */}
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

      {/* Grouped receipt list */}
      <div className="space-y-3">
        {renderGroupedView()}
      </div>

      {/* Add Receipt Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-soft">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h3 className="text-lg font-serif text-foreground">Add Receipt</h3>
              <button onClick={handleClose} className="text-muted-foreground hover:text-foreground p-1.5 hover:bg-accent rounded-full"><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3 max-h-[70vh] overflow-y-auto no-scrollbar">
              {/* Image capture */}
              <div className="flex gap-2">
                <button type="button" onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-accent border border-border rounded-xl text-foreground text-[10px] font-bold uppercase tracking-widest hover:bg-primary/10 transition-all">
                  <Camera size={16} /> Camera
                </button>
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-accent border border-border rounded-xl text-foreground text-[10px] font-bold uppercase tracking-widest hover:bg-primary/10 transition-all">
                  <Upload size={16} /> Upload
                </button>
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageCapture} />
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageCapture} />
              </div>

              {formData.imageUrl && (
                <div className="relative rounded-xl overflow-hidden border border-border">
                  <img src={formData.imageUrl} alt="Receipt preview" className="w-full h-40 object-cover" />
                  <button type="button" onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                    className="absolute top-2 right-2 bg-background/80 p-1 rounded-full text-destructive"><X size={14} /></button>
                </div>
              )}

              {/* Project picker */}
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Project</label>
                {!showNewProject ? (
                  <div className="flex gap-2">
                    <select value={formData.projectId} onChange={e => setFormData({ ...formData, projectId: e.target.value })}
                      className="flex-1 bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none">
                      <option value="">General (No Project)</option>
                      {projects.filter(p => p.status === 'active').map(p => (
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
                    <button type="button" onClick={handleAddProject}
                      className="px-3 bg-primary text-primary-foreground rounded-lg text-[10px] font-bold uppercase tracking-widest">Add</button>
                    <button type="button" onClick={() => { setShowNewProject(false); setNewProjectName(''); }}
                      className="px-2 text-muted-foreground hover:text-foreground"><X size={14} /></button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Vendor / Store</label>
                <input required type="text" value={formData.vendor} onChange={e => setFormData({ ...formData, vendor: e.target.value })}
                  className="w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Amount ($)</label>
                  <input required type="number" step="0.01" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Date</label>
                  <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Category</label>
                <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value as ReceiptCategory })}
                  className="w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none">
                  {RECEIPT_CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Notes</label>
                <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none h-16 resize-none" />
              </div>

              <div className="pt-2 flex gap-2 justify-end">
                <button type="button" onClick={handleClose} className="px-4 py-2 rounded-lg text-muted-foreground font-bold text-[10px] uppercase tracking-widest">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-glow">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Receipts;
