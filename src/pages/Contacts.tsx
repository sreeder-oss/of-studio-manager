import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ChevronRight, X, Trash2, ShieldCheck } from 'lucide-react';
import { useContacts, useSaveContact, useDeleteContact } from '@/hooks/useContacts';
import { PRIVACY_NOTICE } from '@/lib/legal';
import { toast } from 'sonner';

const Contacts: React.FC = () => {
  const navigate = useNavigate();
  const { data: contacts = [], isLoading } = useContacts();
  const saveContact = useSaveContact();
  const deleteContactMut = useDeleteContact();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'Client' | 'Lead' | 'Vendor'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', address: '', notes: '', type: 'Client', status: 'Active'
  });

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || (c.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === 'all' || c.type === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const contactCounts = {
    all: contacts.length,
    Client: contacts.filter(c => c.type === 'Client').length,
    Lead: contacts.filter(c => c.type === 'Lead').length,
    Vendor: contacts.filter(c => c.type === 'Vendor').length,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    try {
      await saveContact.mutateAsync({
        ...(editingId ? { id: editingId } : {}),
        name: formData.name, email: formData.email || null, phone: formData.phone || null,
        address: formData.address || null, notes: formData.notes || null,
        type: formData.type, status: formData.status,
        created_at: null,
      });
      toast.success(editingId ? 'Contact updated' : 'Contact added');
      handleCloseModal();
    } catch { toast.error('Failed to save contact'); }
  };

  const handleEdit = (contact: typeof contacts[0]) => {
    setFormData({
      name: contact.name, email: contact.email || '', phone: contact.phone || '',
      address: contact.address || '', notes: contact.notes || '',
      type: contact.type || 'Client', status: contact.status || 'Active'
    });
    setEditingId(contact.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this contact?')) {
      await deleteContactMut.mutateAsync(id);
      toast.success('Contact deleted');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: '', email: '', phone: '', address: '', notes: '', type: 'Client', status: 'Active' });
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      Active: 'bg-primary/10 text-primary border-primary/20',
      Estimate: 'bg-warning/10 text-warning border-warning/20',
      Pending: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      Inactive: 'bg-muted text-muted-foreground border-border',
    };
    return <span className={`text-[8px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-wider ${styles[status] || styles.Inactive}`}>{status}</span>;
  };

  const CategoryBadge = ({ category }: { category: string }) => {
    const styles: Record<string, string> = {
      Client: 'bg-primary/5 text-primary',
      Lead: 'bg-amber-500/10 text-amber-400',
      Vendor: 'bg-blue-500/10 text-blue-400',
    };
    return <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${styles[category] || ''}`}>{category}</span>;
  };

  if (isLoading) return <div className="text-center py-20 text-muted-foreground text-sm">Loading contacts...</div>;

  return (
    <div className="space-y-4 animate-fade-in pb-20 max-w-2xl mx-auto">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-serif text-foreground tracking-tight">Contacts</h2>
          <p className="text-muted-foreground text-[9px] uppercase tracking-widest mt-0.5 font-bold">{contacts.length} Total</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-primary hover:bg-accent hover:scale-105 transition-all shadow-glow">
          <Plus size={20} />
        </button>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <input type="text" placeholder="Search contacts..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-card border border-border rounded-xl py-2.5 pl-12 pr-4 text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground text-[12px]" />
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {(['all', 'Client', 'Lead', 'Vendor'] as const).map(filter => (
          <button key={filter} onClick={() => setActiveFilter(filter)}
            className={`px-4 py-1.5 rounded-full text-[9px] font-bold tracking-widest uppercase whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeFilter === filter ? 'bg-primary text-primary-foreground shadow-glow' : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            }`}>
            {filter}
            <span className={`text-[8px] ${activeFilter === filter ? 'text-primary-foreground/70' : 'text-muted-foreground/50'}`}>
              {contactCounts[filter]}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {filteredContacts.length === 0 ? (
          <div className="text-center py-8 bg-card rounded-xl border border-dashed border-border">
            <p className="text-muted-foreground text-[11px]">No contacts found.</p>
          </div>
        ) : (
          filteredContacts.map(contact => (
            <div key={contact.id} onClick={() => navigate(`/contacts/${contact.id}`)}
              className="bg-card/60 border border-border rounded-lg p-3 flex items-center gap-3 hover:bg-card hover:border-primary/20 transition-all cursor-pointer group">
              <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center text-muted-foreground group-hover:text-primary font-serif font-bold text-sm border border-border transition-colors">
                {contact.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-foreground font-semibold text-[13px] group-hover:text-primary truncate transition-colors">{contact.name}</h3>
                  <StatusBadge status={contact.status || 'Active'} />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <CategoryBadge category={contact.type || 'Client'} />
                  <span className="text-[9px] text-muted-foreground truncate">{contact.email || contact.phone || 'No info'}</span>
                </div>
              </div>
              <ChevronRight size={14} className="text-muted-foreground/30 group-hover:text-primary transition-colors flex-shrink-0" />
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-soft">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h3 className="text-lg font-serif text-foreground">{editingId ? 'Edit Contact' : 'New Contact'}</h3>
              <button onClick={handleCloseModal} className="text-muted-foreground hover:text-foreground p-1.5 hover:bg-accent rounded-full"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar">
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Full Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Type</label>
                  <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none">
                    <option value="Client">Client</option>
                    <option value="Lead">Lead</option>
                    <option value="Vendor">Vendor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Status</label>
                  <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none">
                    <option value="Active">Active</option>
                    <option value="Estimate">Estimate</option>
                    <option value="Pending">Pending</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Phone</label>
                  <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Email</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Address</label>
                <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none" />
              </div>
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Notes</label>
                <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none h-16 resize-none" />
              </div>
              <div className="pt-4 flex justify-between items-center gap-2">
                {editingId && (
                  <button type="button" onClick={() => handleDelete(editingId)} className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all">
                    <Trash2 size={16} />
                  </button>
                )}
                <div className="flex gap-2 ml-auto">
                  <button type="button" onClick={handleCloseModal} className="px-4 py-2 rounded-lg text-muted-foreground font-bold text-[10px] uppercase tracking-widest">Cancel</button>
                  <button type="submit" disabled={saveContact.isPending} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-glow disabled:opacity-50">
                    {saveContact.isPending ? 'Saving...' : 'Save'}
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

export default Contacts;
