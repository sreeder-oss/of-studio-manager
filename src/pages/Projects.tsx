import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ChevronRight, X, Trash2, FolderKanban, MapPin, Calendar, DollarSign } from 'lucide-react';
import { useProjects, useSaveProject, useDeleteProject } from '@/hooks/useProjects';
import { useContacts } from '@/hooks/useContacts';
import { toast } from 'sonner';

const STATUS_OPTIONS = ['Bidding', 'Active', 'Complete', 'Archived'] as const;

const statusStyles: Record<string, string> = {
  Bidding: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Active: 'bg-primary/10 text-primary border-primary/20',
  Complete: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Archived: 'bg-muted text-muted-foreground border-border',
};

const Projects: React.FC = () => {
  const navigate = useNavigate();
  const { data: projects = [], isLoading } = useProjects();
  const { data: contacts = [] } = useContacts();
  const saveProject = useSaveProject();
  const deleteProjectMut = useDeleteProject();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '', contact_id: '', status: 'Bidding', address: '',
    start_date: '', end_date: '', contract_value: '', notes: ''
  });

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getContactName = (contactId: string | null) =>
    contacts.find(c => c.id === contactId)?.name || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    try {
      await saveProject.mutateAsync({
        ...(editingId ? { id: editingId } : {}),
        name: formData.name,
        contact_id: formData.contact_id || null,
        status: formData.status,
        address: formData.address || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        contract_value: formData.contract_value ? parseFloat(formData.contract_value) : null,
        notes: formData.notes || null,
      });
      toast.success(editingId ? 'Project updated' : 'Project created');
      handleClose();
    } catch { toast.error('Failed to save project'); }
  };

  const handleEdit = (project: typeof projects[0]) => {
    setFormData({
      name: project.name,
      contact_id: project.contact_id || '',
      status: project.status || 'Bidding',
      address: project.address || '',
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      contract_value: project.contract_value?.toString() || '',
      notes: project.notes || '',
    });
    setEditingId(project.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this project and all related data?')) {
      await deleteProjectMut.mutateAsync(id);
      toast.success('Project deleted');
      handleClose();
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: '', contact_id: '', status: 'Bidding', address: '', start_date: '', end_date: '', contract_value: '', notes: '' });
  };

  if (isLoading) return <div className="text-center py-20 text-muted-foreground text-sm">Loading projects...</div>;

  return (
    <div className="space-y-4 animate-fade-in pb-20 max-w-2xl mx-auto">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-serif text-foreground tracking-tight">Projects</h2>
          <p className="text-muted-foreground text-[9px] uppercase tracking-widest mt-0.5 font-bold">{projects.length} Total</p>
        </div>
        <button onClick={() => setIsModalOpen(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-glow flex items-center gap-1.5">
          <Plus size={14} /> New Project
        </button>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <input type="text" placeholder="Search projects..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-card border border-border rounded-xl py-2.5 pl-12 pr-4 text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground text-[12px]" />
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {['all', ...STATUS_OPTIONS].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-[9px] font-bold tracking-widest uppercase whitespace-nowrap transition-all ${
              statusFilter === s ? 'bg-primary text-primary-foreground shadow-glow' : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            }`}>{s}</button>
        ))}
      </div>

      <div className="space-y-2">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-10 bg-card rounded-xl border border-dashed border-border">
            <FolderKanban size={32} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground text-[11px]">No projects yet. Create your first project.</p>
          </div>
        ) : (
          filteredProjects.map(project => {
            const clientName = getContactName(project.contact_id);
            return (
              <div key={project.id}
                className="bg-card border border-border rounded-xl p-4 hover:border-primary/20 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between" onClick={() => navigate(`/projects/${project.id}`)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-foreground font-semibold text-sm group-hover:text-primary truncate transition-colors">{project.name}</h3>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-wider flex-shrink-0 ${statusStyles[project.status || 'Bidding']}`}>
                        {project.status}
                      </span>
                    </div>
                    {clientName && <p className="text-[10px] text-muted-foreground">{clientName}</p>}
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {project.address && (
                        <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                          <MapPin size={10} /> {project.address}
                        </span>
                      )}
                      {project.start_date && (
                        <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                          <Calendar size={10} /> {new Date(project.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                      {project.contract_value && (
                        <span className="flex items-center gap-1 text-[9px] text-primary font-bold">
                          <DollarSign size={10} /> {Number(project.contract_value).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <button onClick={(e) => { e.stopPropagation(); handleEdit(project); }}
                      className="text-[9px] text-primary font-bold uppercase tracking-widest hover:underline">Edit</button>
                    <ChevronRight size={14} className="text-muted-foreground/30 group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-soft">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h3 className="text-lg font-serif text-foreground">{editingId ? 'Edit Project' : 'New Project'}</h3>
              <button onClick={handleClose} className="text-muted-foreground hover:text-foreground p-1.5 hover:bg-accent rounded-full"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3 max-h-[65vh] overflow-y-auto no-scrollbar">
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Project Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Client</label>
                  <select value={formData.contact_id} onChange={e => setFormData({ ...formData, contact_id: e.target.value })}
                    className="w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none">
                    <option value="">None</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Status</label>
                  <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none">
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Address</label>
                <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Start Date</label>
                  <input type="date" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">End Date</label>
                  <input type="date" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Contract Value ($)</label>
                <input type="number" step="0.01" value={formData.contract_value} onChange={e => setFormData({ ...formData, contract_value: e.target.value })}
                  className="w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none" />
              </div>
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Notes</label>
                <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none h-16 resize-none" />
              </div>
              <div className="pt-4 flex justify-between items-center gap-2">
                {editingId && (
                  <button type="button" onClick={() => handleDelete(editingId)}
                    className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all">
                    <Trash2 size={16} />
                  </button>
                )}
                <div className="flex gap-2 ml-auto">
                  <button type="button" onClick={handleClose} className="px-4 py-2 rounded-lg text-muted-foreground font-bold text-[10px] uppercase tracking-widest">Cancel</button>
                  <button type="submit" disabled={saveProject.isPending}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-glow disabled:opacity-50">
                    {saveProject.isPending ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
