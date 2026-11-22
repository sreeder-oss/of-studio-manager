import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ChevronRight, Trash2, Mail, FileText, ArrowRightCircle, Sparkles, UserCheck, Users, Briefcase } from 'lucide-react';
import { useContacts, useSaveContact, useDeleteContact, type DbContact } from '@/hooks/useContacts';
import { SEED_OUTREACH_LEADS } from '@/data/seedLeads';
import { OutreachEmailModal } from '@/components/OutreachEmailModal';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type ContactType = 'Client' | 'Lead' | 'Vendor';

const STATUS_BY_TYPE: Record<ContactType, string[]> = {
  Client: ['Active', 'Inactive'],
  Lead: ['Pending', 'Active', 'Inactive'],
  Vendor: ['Active', 'Inactive'],
};

const DEFAULT_STATUS: Record<ContactType, string> = {
  Client: 'Active',
  Lead: 'Pending',
  Vendor: 'Active',
};

const isValidEmail = (v: string) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const Contacts: React.FC = () => {
  const navigate = useNavigate();
  const { data: contacts = [], isLoading } = useContacts();
  const saveContact = useSaveContact();
  const deleteContactMut = useDeleteContact();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'Client' | 'Lead' | 'Vendor' | 'all'>('Client');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [outreachContact, setOutreachContact] = useState<DbContact | null>(null);
  const [isSeedingLeads, setIsSeedingLeads] = useState(false);

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', address: '', notes: '',
    type: 'Client' as ContactType, status: 'Active',
  });

  const searchMatches = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return contacts.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.notes || '').toLowerCase().includes(q) ||
      (c.address || '').toLowerCase().includes(q)
    );
  }, [contacts, searchTerm]);

  const filteredContacts = useMemo(
    () => searchMatches.filter(c => activeFilter === 'all' || c.type === activeFilter),
    [searchMatches, activeFilter],
  );

  const contactCounts = useMemo(() => ({
    all: searchMatches.length,
    Client: searchMatches.filter(c => c.type === 'Client').length,
    Lead: searchMatches.filter(c => c.type === 'Lead').length,
    Vendor: searchMatches.filter(c => c.type === 'Vendor').length,
  }), [searchMatches]);

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '', email: '', phone: '', address: '', notes: '',
      type: activeFilter === 'Lead' ? 'Lead' : 'Client',
      status: activeFilter === 'Lead' ? 'Pending' : 'Active',
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
    const phone = formData.phone.trim();
    const address = formData.address.trim();
    const notes = formData.notes.trim();

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
        phone: phone || null,
        address: address || null,
        notes: notes || null,
        type: formData.type,
        status: formData.status,
      });
      toast.success(editingId ? 'Contact updated' : 'Contact added');
      handleCloseModal();
    } catch {
      // Mutation cache surfaces a friendly toast already.
    }
  };

  const handleEdit = (contact: DbContact) => {
    const type = (contact.type as ContactType) || 'Client';
    setFormData({
      name: contact.name,
      email: contact.email || '',
      phone: contact.phone || '',
      address: contact.address || '',
      notes: contact.notes || '',
      type,
      status: contact.status || DEFAULT_STATUS[type],
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

  const handlePromoteToClient = async (e: React.MouseEvent, contact: DbContact) => {
    e.stopPropagation();
    try {
      await saveContact.mutateAsync({
        ...contact,
        type: 'Client',
        status: 'Active',
        notes: contact.notes ? `${contact.notes}\n[Promoted from Potential Client on ${new Date().toLocaleDateString()}]` : '[Promoted from Potential Client]',
      });
      toast.success(`${contact.name} converted to Client! Opening Estimate...`);
      navigate(`/estimates/new?contactId=${contact.id}`);
    } catch {
      toast.error('Failed to promote contact');
    }
  };

  const handleCreateEstimate = (e: React.MouseEvent, contactId: string) => {
    e.stopPropagation();
    navigate(`/estimates/new?contactId=${contactId}`);
  };

  const handleSeedLeads = async () => {
    if (isSeedingLeads) return;
    setIsSeedingLeads(true);
    try {
      let added = 0;
      const existingNames = new Set(contacts.map(c => c.name.toLowerCase()));
      for (const lead of SEED_OUTREACH_LEADS) {
        if (!existingNames.has(lead.name.toLowerCase())) {
          await saveContact.mutateAsync(lead);
          added++;
        }
      }
      toast.success(`Imported ${added} outreach leads across OK, TX, AR, KS & MO!`);
      setActiveFilter('Lead');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to import leads');
    } finally {
      setIsSeedingLeads(false);
    }
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
    const isPotential = category === 'Lead';
    const label = isPotential ? 'Potential Client' : category;
    const styles: Record<string, string> = {
      Client: 'bg-primary/10 text-primary border border-primary/20',
      Lead: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
      Vendor: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    };
    return <span className={`text-[8px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${styles[category] || ''}`}>{label}</span>;
  };

  if (isLoading) return <div className="text-center py-20 text-muted-foreground text-sm">Loading contacts...</div>;

  const statusOptions = STATUS_BY_TYPE[formData.type];

  return (
    <div className="space-y-4 animate-fade-in pb-20 max-w-5xl mx-auto">
      <header className="flex justify-between items-center gap-2">
        <div>
          <h2 className="text-xl font-serif text-foreground tracking-tight">Contacts & Directory</h2>
          <p className="text-muted-foreground text-[10px] uppercase tracking-widest mt-0.5 font-bold">
            {contactCounts.Client} Clients • {contactCounts.Lead} Potential Clients
          </p>
        </div>
        <div className="flex items-center gap-2">
          {contactCounts.Lead === 0 && (
            <button
              onClick={handleSeedLeads}
              disabled={isSeedingLeads}
              className="px-3 py-1.5 rounded-lg bg-card border border-border text-primary hover:bg-accent text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
              title="Import 33 commercial GC & designer leads from 5-State Lead Tracker"
            >
              <Sparkles size={14} className="text-primary" />
              <span>{isSeedingLeads ? 'Importing...' : 'Import 5-State Leads'}</span>
            </button>
          )}
          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-primary hover:bg-accent hover:scale-105 transition-all shadow-glow"
            aria-label="Add contact"
          >
            <Plus size={20} />
          </button>
        </div>
      </header>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <input
          type="text"
          placeholder="Search by company, name, email, city, or specialty..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-card border border-border rounded-xl py-2.5 pl-12 pr-4 text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground text-xs"
        />
      </div>

      {/* Primary vs Secondary Directory Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-2">
        {/* Main Tabs: Clients & Potential Clients */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveFilter('Client')}
            className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider transition-all flex items-center gap-2 ${
              activeFilter === 'Client'
                ? 'bg-primary text-primary-foreground shadow-glow'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <Briefcase size={14} />
            Clients (Bids & Invoices)
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeFilter === 'Client' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-accent text-muted-foreground'}`}>
              {contactCounts.Client}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('Lead')}
            className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider transition-all flex items-center gap-2 ${
              activeFilter === 'Lead'
                ? 'bg-amber-600 text-white shadow-glow'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <Mail size={14} />
            Potential Clients (Outreach)
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeFilter === 'Lead' ? 'bg-white/20 text-white' : 'bg-accent text-muted-foreground'}`}>
              {contactCounts.Lead}
            </span>
          </button>
        </div>

        {/* Secondary filters: Vendors & All */}
        <div className="flex items-center gap-1.5 self-end sm:self-center">
          <button
            onClick={() => setActiveFilter('Vendor')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold tracking-wider transition-all ${
              activeFilter === 'Vendor'
                ? 'bg-accent text-foreground border border-border font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Vendors ({contactCounts.Vendor})
          </button>
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold tracking-wider transition-all ${
              activeFilter === 'all'
                ? 'bg-accent text-foreground border border-border font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All ({contactCounts.all})
          </button>
        </div>
      </div>

      {/* Contact List */}
      <div className="space-y-2">
        {filteredContacts.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-dashed border-border px-4">
            <p className="text-muted-foreground text-xs font-medium">
              {activeFilter === 'Lead' ? 'No potential clients found.' : 'No contacts found.'}
            </p>
            {activeFilter === 'Lead' && (
              <button
                onClick={handleSeedLeads}
                disabled={isSeedingLeads}
                className="mt-3 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg shadow-glow inline-flex items-center gap-1.5"
              >
                <Sparkles size={14} />
                Import 33 Leads from 5-State Lead Tracker
              </button>
            )}
          </div>
        ) : (
          filteredContacts.map(contact => {
            const isPotential = contact.type === 'Lead';
            return (
              <div
                key={contact.id}
                onClick={() => navigate(`/contacts/${contact.id}`)}
                className="bg-card/70 border border-border rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-card hover:border-primary/30 transition-all cursor-pointer group shadow-sm"
              >
                {/* Left: Contact Info */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center font-serif font-bold text-sm border flex-shrink-0 transition-colors ${
                    isPotential
                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      : 'bg-primary/10 text-primary border-primary/20'
                  }`}>
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

                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground truncate">
                      {contact.email && <span className="truncate">{contact.email}</span>}
                      {contact.phone && <span>{contact.phone}</span>}
                      {contact.address && <span className="hidden md:inline truncate">• {contact.address}</span>}
                    </div>

                    {contact.notes && (
                      <p className="text-[10px] text-muted-foreground/80 line-clamp-1 mt-1 font-mono">
                        {contact.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Contextual Quick Actions */}
                <div className="flex items-center gap-1.5 sm:self-center self-end flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 w-full sm:w-auto justify-end">
                  {/* For Potential Clients: Email Info & Convert */}
                  {isPotential && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOutreachContact(contact);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-semibold flex items-center gap-1 transition-all"
                        title="Draft email & open in Gmail"
                      >
                        <Mail size={13} />
                        <span>Email Info</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handlePromoteToClient(e, contact)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 transition-all"
                        title="Promote to Client and create estimate"
                      >
                        <UserCheck size={13} />
                        <span>Make Estimate</span>
                      </button>
                    </>
                  )}

                  {/* For Clients: Direct Estimate */}
                  {!isPotential && contact.type === 'Client' && (
                    <button
                      type="button"
                      onClick={(e) => handleCreateEstimate(e, contact.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-semibold flex items-center gap-1 transition-all"
                      title="Create Estimate for this client"
                    >
                      <FileText size={13} />
                      <span>Estimate</span>
                    </button>
                  )}

                  <ChevronRight size={16} className="text-muted-foreground/40 group-hover:text-primary transition-colors ml-1 hidden sm:block" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Outreach Email Modal */}
      <OutreachEmailModal
        contact={outreachContact}
        isOpen={!!outreachContact}
        onClose={() => setOutreachContact(null)}
      />

      {/* Add / Edit Contact Modal */}
      <Dialog open={isModalOpen} onOpenChange={(o) => (o ? setIsModalOpen(true) : handleCloseModal())}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">{editingId ? 'Edit Contact' : 'New Contact'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar pr-1">
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Company / Full Name</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Directory Classification</label>
                <select
                  value={formData.type}
                  onChange={e => {
                    const nextType = e.target.value as ContactType;
                    const nextStatusOptions = STATUS_BY_TYPE[nextType];
                    setFormData(f => ({
                      ...f,
                      type: nextType,
                      status: nextStatusOptions.includes(f.status) ? f.status : DEFAULT_STATUS[nextType],
                    }));
                  }}
                  className="w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none">
                  <option value="Client">Client (Estimates & Invoices)</option>
                  <option value="Lead">Potential Client (Outreach & Info)</option>
                  <option value="Vendor">Vendor (Suppliers & Subs)</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Status</label>
                <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none">
                  {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
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
              <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">City, State / Site Address</label>
              <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none" />
            </div>
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Notes / Specialty & Pitch Angle</label>
              <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                className="w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none h-16 resize-none" />
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
              ) : <span />}
              <div className="flex gap-2 ml-auto">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 rounded-lg text-muted-foreground font-bold text-[10px] uppercase tracking-widest">Cancel</button>
                <button type="submit" disabled={saveContact.isPending} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-glow disabled:opacity-50">
                  {saveContact.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
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
