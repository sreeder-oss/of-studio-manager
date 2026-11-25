import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Briefcase, ChevronRight, FileText, Pencil, Plus, Search, Send, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useContacts, useDeleteContact, useSaveContact, type DbContact } from '@/hooks/useContacts';
import { filterDirectoryContacts, type DirectoryTab } from '@/lib/contactFilters';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type ContactType = 'Client' | 'Vendor';

const STATUS_OPTIONS = ['Active', 'Inactive'];
const isValidEmail = (v: string) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const Contacts: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: contacts = [], isLoading } = useContacts();
  const saveContact = useSaveContact();
  const deleteContactMut = useDeleteContact();

  const initialTab = ((): DirectoryTab => {
    const t = searchParams.get('tab');
    if (t === 'Client' || t === 'Vendor' || t === 'all') return t;
    return 'Client';
  })();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<DirectoryTab>(initialTab);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'Lead') {
      navigate('/outreach', { replace: true });
      return;
    }
    if (t === 'Client' || t === 'Vendor' || t === 'all') {
      setActiveFilter(t);
    }
  }, [searchParams, navigate]);

  const selectTab = (tab: DirectoryTab) => {
    setActiveFilter(tab);
    setSearchParams(tab === 'Client' ? {} : { tab }, { replace: true });
  };

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    type: 'Client' as ContactType,
    status: 'Active',
  });

  const allDirectoryMatches = useMemo(
    () => filterDirectoryContacts(contacts, 'all', searchTerm),
    [contacts, searchTerm],
  );

  const filteredContacts = useMemo(
    () => filterDirectoryContacts(contacts, activeFilter, searchTerm),
    [contacts, activeFilter, searchTerm],
  );

  const contactCounts = useMemo(
    () => ({
      all: allDirectoryMatches.length,
      Client: allDirectoryMatches.filter((c) => c.type === 'Client').length,
      Vendor: allDirectoryMatches.filter((c) => c.type === 'Vendor').length,
    }),
    [allDirectoryMatches],
  );

  const outreachCount = useMemo(
    () => contacts.filter((c) => c.type === 'Lead').length,
    [contacts],
  );

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      notes: '',
      type: activeFilter === 'Vendor' ? 'Vendor' : 'Client',
      status: 'Active',
    });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = formData.name.trim();
    const email = formData.email.trim();
    if (!name) {
      toast.error('Name is required');
      return;
    }
    if (!isValidEmail(email)) {
      toast.error('Please enter a valid email');
      return;
    }

    try {
      await saveContact.mutateAsync({
        ...(editingId ? { id: editingId } : {}),
        name,
        email: email || null,
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        notes: formData.notes.trim() || null,
        type: formData.type,
        status: formData.status,
      });
      toast.success(editingId ? 'Contact updated' : 'Contact added');
      handleCloseModal();
    } catch {
      // Mutation cache surfaces a friendly toast already.
    }
  };

  const handleEdit = (e: React.MouseEvent, contact: DbContact) => {
    e.stopPropagation();
    const type: ContactType = contact.type === 'Vendor' ? 'Vendor' : 'Client';
    setFormData({
      name: contact.name,
      email: contact.email || '',
      phone: contact.phone || '',
      address: contact.address || '',
      notes: contact.notes || '',
      type,
      status: contact.status || 'Active',
    });
    setEditingId(contact.id);
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await deleteContactMut.mutateAsync(pendingDeleteId);
      toast.success('Contact deleted');
      setPendingDeleteId(null);
      handleCloseModal();
    } catch {
      // global error toast
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      Active: 'bg-primary/10 text-primary border-primary/25',
      Inactive: 'bg-muted text-muted-foreground border-border',
    };
    return (
      <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold tracking-wider ${styles[status] || styles.Inactive}`}>
        {status}
      </span>
    );
  };

  const CategoryBadge = ({ category }: { category: string }) => {
    const styles: Record<string, string> = {
      Client: 'bg-primary/10 text-primary border border-primary/25',
      Vendor: 'bg-blue-500/15 text-blue-300 border border-blue-500/25',
    };
    return (
      <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${styles[category] || ''}`}>
        {category}
      </span>
    );
  };

  if (isLoading) return <div className="text-center py-20 text-muted-foreground text-sm">Loading contacts...</div>;

  return (
    <div className="space-y-4 animate-fade-in pb-20 max-w-5xl mx-auto">
      <header className="flex justify-between items-center gap-2">
        <div>
          <h2 className="text-2xl font-serif text-foreground tracking-tight flex items-center gap-2">
            <Users size={20} className="text-primary" />
            Contacts &amp; Directory
          </h2>
          <p className="text-muted-foreground text-[11px] uppercase tracking-widest mt-0.5 font-semibold">
            {contactCounts.Client} Clients • {contactCounts.Vendor} Vendors
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/outreach')}
            className="px-3 py-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-accent text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Open Outreach Hub for cold prospects & lead verification"
          >
            <Send size={13} className="text-primary shrink-0" />
            <span className="hidden sm:inline">Outreach ({outreachCount})</span>
            <span className="sm:hidden">Outreach</span>
          </button>

          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-primary hover:bg-accent hover:scale-105 transition-all shadow-glow shrink-0"
            aria-label="Add contact"
          >
            <Plus size={20} />
          </button>
        </div>
      </header>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <input
          type="text"
          placeholder="Search clients and vendors by name, email, city, or notes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-card border border-border rounded-xl py-2.5 pl-12 pr-4 text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground text-xs"
        />
      </div>

      {/* Directory Tabs */}
      <div className="flex items-center gap-2 flex-wrap border-b border-border/60 pb-2.5">
        <button
          onClick={() => selectTab('Client')}
          className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider transition-all flex items-center gap-2 ${
            activeFilter === 'Client'
              ? 'bg-primary text-primary-foreground shadow-glow'
              : 'bg-card border border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          <Briefcase size={14} />
          Clients
          <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${activeFilter === 'Client' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-accent text-muted-foreground'}`}>
            {contactCounts.Client}
          </span>
        </button>

        <button
          onClick={() => selectTab('Vendor')}
          className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider transition-all flex items-center gap-2 ${
            activeFilter === 'Vendor'
              ? 'bg-accent text-foreground border border-border font-bold'
              : 'bg-card border border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          Vendors ({contactCounts.Vendor})
        </button>

        <button
          onClick={() => selectTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider transition-all flex items-center gap-2 ${
            activeFilter === 'all'
              ? 'bg-accent text-foreground border border-border font-bold'
              : 'bg-card border border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          All ({contactCounts.all})
        </button>
      </div>

      {/* Contact List */}
      <div className="space-y-2">
        {filteredContacts.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-dashed border-border px-4">
            <p className="text-muted-foreground text-xs font-medium">
              No {activeFilter === 'Vendor' ? 'vendors' : activeFilter === 'Client' ? 'clients' : 'contacts'} found.
            </p>
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => navigate(`/contacts/${contact.id}`)}
              className="bg-card/80 border border-border rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-card hover:border-primary/30 transition-all cursor-pointer group shadow-sm"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="h-10 w-10 rounded-full flex items-center justify-center font-serif font-bold text-sm border bg-primary/10 text-primary border-primary/25 flex-shrink-0">
                  {contact.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-foreground font-semibold text-sm group-hover:text-primary truncate transition-colors">
                      {contact.name}
                    </h3>
                    <CategoryBadge category={contact.type || 'Client'} />
                    <StatusBadge status={contact.status || 'Active'} />
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground truncate">
                    {contact.email && <span className="truncate">{contact.email}</span>}
                    {contact.phone && <span>{contact.phone}</span>}
                    {contact.address && <span className="hidden md:inline truncate">• {contact.address}</span>}
                  </div>

                  {contact.notes && (
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-1">
                      {contact.notes}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:self-center self-end flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 w-full sm:w-auto justify-end flex-wrap">
                {contact.type === 'Client' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/estimates/new?contactId=${contact.id}`);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 text-xs font-semibold flex items-center gap-1.5 transition-all"
                    title="Create Estimate for this client"
                  >
                    <FileText size={13} />
                    <span>Estimate</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => handleEdit(e, contact)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                  title="Edit contact"
                  aria-label={`Edit ${contact.name}`}
                >
                  <Pencil size={14} />
                </button>

                <ChevronRight size={16} className="text-muted-foreground/50 group-hover:text-primary transition-colors hidden sm:block" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Contact Modal */}
      <Dialog open={isModalOpen} onOpenChange={(o) => (o ? setIsModalOpen(true) : handleCloseModal())}>
        <DialogContent className="bg-card border-border text-foreground max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">{editingId ? 'Edit Contact' : 'New Contact'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-accent border border-border rounded-lg p-2.5 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Category</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as ContactType })}
                  className="w-full bg-accent border border-border rounded-lg p-2.5 text-foreground text-xs outline-none"
                >
                  <option value="Client">Client</option>
                  <option value="Vendor">Vendor</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-accent border border-border rounded-lg p-2.5 text-foreground text-xs outline-none"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-accent border border-border rounded-lg p-2.5 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-accent border border-border rounded-lg p-2.5 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-accent border border-border rounded-lg p-2.5 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Notes</label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full bg-accent border border-border rounded-lg p-2.5 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>
            <DialogFooter className="!justify-between !items-center gap-2 pt-2">
              {editingId ? (
                <button
                  type="button"
                  disabled={deleteContactMut.isPending}
                  onClick={() => setPendingDeleteId(editingId)}
                  className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all disabled:opacity-50"
                  aria-label="Delete contact"
                >
                  <Trash2 size={16} />
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2 ml-auto">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 rounded-lg text-muted-foreground font-bold text-[11px] uppercase tracking-widest">
                  Cancel
                </button>
                <button type="submit" disabled={saveContact.isPending} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-[11px] uppercase tracking-widest shadow-glow disabled:opacity-50">
                  {saveContact.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!pendingDeleteId} onOpenChange={(o) => !o && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the contact. Linked projects, estimates, and invoices will keep their history but lose the contact reference.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteContactMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={deleteContactMut.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteContactMut.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Contacts;
