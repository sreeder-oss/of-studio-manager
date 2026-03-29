import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ChevronRight, X, Trash2, ShieldCheck } from 'lucide-react';
import { Contact } from '@/types';
import { getContacts, saveContact, deleteContact } from '@/services/storage';
import { PRIVACY_NOTICE } from '@/lib/legal';

const Contacts: React.FC = () => {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>(getContacts());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'client' | 'lead' | 'vendor'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Contact>>({
    name: '', email: '', phone: '', address: '', notes: '', category: 'client', status: 'active'
  });

  const refresh = () => setContacts(getContacts());

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === 'all' || c.category === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const contactCounts = {
    all: contacts.length,
    client: contacts.filter(c => c.category === 'client').length,
    lead: contacts.filter(c => c.category === 'lead').length,
    vendor: contacts.filter(c => c.category === 'vendor').length,
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    const contact: Contact = {
      id: editingId || `c-${Date.now()}`,
      name: formData.name!,
      email: formData.email || '',
      phone: formData.phone || '',
      address: formData.address || '',
      notes: formData.notes || '',
      category: (formData.category as Contact['category']) || 'client',
      status: (formData.status as Contact['status']) || 'active',
      createdAt: editingId ? (contacts.find(c => c.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
    };
    saveContact(contact);
    refresh();
    handleCloseModal();
  };

  const handleEdit = (contact: Contact) => {
    setFormData(contact);
    setEditingId(contact.id);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this contact?')) {
      deleteContact(id);
      refresh();
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: '', email: '', phone: '', address: '', notes: '', category: 'client', status: 'active' });
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      active: 'bg-primary/10 text-primary border-primary/20',
      estimate: 'bg-warning/10 text-warning border-warning/20',
      pending: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      inactive: 'bg-muted text-muted-foreground border-border',
    };
    return (
      <span className={`text-[8px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-wider ${styles[status] || styles.inactive}`}>
        {status}
      </span>
    );
  };

  const CategoryBadge = ({ category }: { category: string }) => {
    const styles: Record<string, string> = {
      client: 'bg-primary/5 text-primary',
      lead: 'bg-amber-500/10 text-amber-400',
      vendor: 'bg-blue-500/10 text-blue-400',
    };
    return (
      <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${styles[category] || ''}`}>
        {category}
      </span>
    );
  };

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
        {(['all', 'client', 'lead', 'vendor'] as const).map(filter => (
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
                  <StatusBadge status={contact.status} />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <CategoryBadge category={contact.category} />
                  <span className="text-[9px] text-muted-foreground truncate">{contact.email || contact.phone || 'No info'}</span>
                </div>
              </div>
              <ChevronRight size={14} className="text-muted-foreground/30 group-hover:text-primary transition-colors flex-shrink-0" />
            </div>
          ))
        )}
      </div>

      {/* Modal */}
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
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Category</label>
                  <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none">
                    <option value="client">Client</option>
                    <option value="lead">Lead</option>
                    <option value="vendor">Vendor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Status</label>
                  <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none">
                    <option value="active">Active</option>
                    <option value="estimate">Estimate</option>
                    <option value="pending">Pending</option>
                    <option value="inactive">Inactive</option>
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
                  <button type="submit" className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-glow">Save</button>
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
