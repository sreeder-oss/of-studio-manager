import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, Phone, Mail, MapPin, ShieldCheck, FileText, UserCheck, ArrowRight, Pencil, Sparkles, CheckCircle2, RefreshCw } from 'lucide-react';
import { useContact, useSaveContact, useDeleteContact } from '@/hooks/useContacts';
import { useAIPageContext } from '@/hooks/useAIPageContext';
import { OutreachEmailModal } from '@/components/OutreachEmailModal';
import { enrichContactWithAI, getOutreachSentInfo } from '@/lib/gmail';
import { PRIVACY_NOTICE } from '@/lib/legal';
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

const ContactDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: contact, isLoading } = useContact(id!);
  const saveContact = useSaveContact();
  const deleteContactMut = useDeleteContact();
  const [isOutreachOpen, setIsOutreachOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', address: '', notes: '',
    type: 'Client' as ContactType, status: 'Active',
  });

  useAIPageContext(contact ? {
    kind: 'contact', id: contact.id, name: contact.name,
    email: contact.email, phone: contact.phone, type: contact.type,
  } : null);

  if (isLoading) return <div className="text-center py-20 text-muted-foreground text-sm">Loading...</div>;

  if (!contact) {
    return (
      <div className="text-center py-20 max-w-2xl mx-auto">
        <p className="text-muted-foreground text-sm">Contact not found.</p>
        <button onClick={() => navigate('/contacts')} className="text-primary text-xs mt-2 hover:underline">Back to Contacts</button>
      </div>
    );
  }

  const isPotential = contact.type === 'Lead';

  const openEditModal = () => {
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
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
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
        id: contact.id,
        name,
        email: email || null,
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        notes: formData.notes.trim() || null,
        type: formData.type,
        status: formData.status,
      });
      toast.success('Contact updated');
      setIsEditOpen(false);
    } catch {
      // global error toast
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteContactMut.mutateAsync(contact.id);
      toast.success('Contact deleted');
      navigate('/contacts');
    } catch {
      // global error toast
    }
  };

  const [enriching, setEnriching] = useState(false);

  const sentInfo = isPotential ? getOutreachSentInfo(contact.notes) : { sent: false, lastSentDate: null, count: 0 };

  const handleToggleSent = async () => {
    const currentSent = sentInfo.sent;
    let nextNotes = contact.notes || '';
    if (currentSent) {
      nextNotes = nextNotes.replace(/\[Outreach sent[^\]]*\]/gi, '').trim();
    } else {
      const stamp = `[Outreach sent on ${new Date().toLocaleDateString()}]`;
      nextNotes = nextNotes ? `${nextNotes}\n${stamp}` : stamp;
    }
    await saveContact.mutateAsync({ ...contact, notes: nextNotes || null });
    toast.success(currentSent ? 'Marked unsent' : 'Marked as sent');
  };

  const handleEnrich = async () => {
    setEnriching(true);
    try {
      const found = await enrichContactWithAI({
        name: contact.name,
        address: contact.address,
        email: contact.email,
        phone: contact.phone,
        notes: contact.notes,
      });

      const updates: string[] = [];
      const nextEmail = contact.email || found.email;
      const nextPhone = contact.phone || found.phone;
      const nextAddress =
        found.address && (!contact.address || found.address.length > contact.address.length + 5)
          ? found.address
          : contact.address;

      if (!contact.email && found.email) updates.push(`email (${found.email})`);
      if (!contact.phone && found.phone) updates.push(`phone (${found.phone})`);
      if (nextAddress !== contact.address && found.address) updates.push('street address');

      const extraNoteParts: string[] = [];
      const existingNotes = contact.notes || '';
      if (found.contact_person && !existingNotes.toLowerCase().includes(found.contact_person.toLowerCase())) {
        extraNoteParts.push(`Contact: ${found.contact_person}`);
        updates.push('contact name');
      }
      if (found.instagram && !existingNotes.toLowerCase().includes(found.instagram.toLowerCase())) {
        extraNoteParts.push(`IG: ${found.instagram}`);
        updates.push(`IG (${found.instagram})`);
      }
      if (found.website && !existingNotes.toLowerCase().includes(found.website.replace(/^https?:\/\//, '').toLowerCase())) {
        extraNoteParts.push(`Website: ${found.website}`);
        updates.push('website');
      }
      if (found.notes_summary && !existingNotes.includes(found.notes_summary)) {
        extraNoteParts.push(found.notes_summary);
      }

      if (updates.length === 0 && extraNoteParts.length === 0) {
        toast.info(`No additional public/IG details found for ${contact.name}.`);
        return;
      }

      const combinedNotes = extraNoteParts.length
        ? (existingNotes ? `${existingNotes}\n[Enriched: ${extraNoteParts.join(' | ')}]` : `[Enriched: ${extraNoteParts.join(' | ')}]`)
        : existingNotes;

      await saveContact.mutateAsync({
        ...contact,
        email: nextEmail,
        phone: nextPhone,
        address: nextAddress,
        notes: combinedNotes || null,
      });
      toast.success(`Updated ${contact.name}: added ${updates.join(', ') || 'notes'}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Could not enrich ${contact.name}`;
      toast.error(msg, { duration: 6000 });
    } finally {
      setEnriching(false);
    }
  };

  const handlePromoteToClient = async () => {
    try {
      await saveContact.mutateAsync({
        ...contact,
        type: 'Client',
        status: 'Active',
        notes: contact.notes
          ? `${contact.notes}\n[Promoted to Client on ${new Date().toLocaleDateString()}]`
          : `[Promoted to Client on ${new Date().toLocaleDateString()}]`,
      });
      toast.success(`${contact.name} converted to Client! Opening Estimate...`);
      navigate(`/estimates/new?contactId=${contact.id}`);
    } catch {
      toast.error('Failed to convert contact');
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      Active: 'bg-primary/10 text-primary border-primary/25',
      Estimate: 'bg-warning/15 text-warning border-warning/30',
      Pending: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
      Inactive: 'bg-muted text-muted-foreground border-border',
    };
    return <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold tracking-wider ${styles[status] || styles.Inactive}`}>{status}</span>;
  };

  const CategoryBadge = ({ category }: { category: string }) => {
    const isPot = category === 'Lead';
    const label = isPot ? 'Potential Client' : category;
    const styles: Record<string, string> = {
      Client: 'bg-primary/10 text-primary border border-primary/25',
      Lead: 'bg-warning/15 text-warning border border-warning/30',
      Vendor: 'bg-blue-500/15 text-blue-300 border border-blue-500/25',
    };
    return <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${styles[category] || ''}`}>{label}</span>;
  };

  const statusOptions = STATUS_BY_TYPE[formData.type];

  return (
    <div className="space-y-4 animate-fade-in pb-20 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(isPotential ? '/contacts?tab=Lead' : '/contacts')} className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-[11px] font-bold uppercase tracking-widest">
          <ChevronRight size={14} className="rotate-180" /> All Contacts
        </button>
        <button
          onClick={openEditModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-semibold text-foreground hover:border-primary/40 transition-all"
        >
          <Pencil size={13} className="text-primary" />
          Edit
        </button>
      </div>

      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className={`h-14 w-14 rounded-full flex items-center justify-center font-serif text-2xl border ${
              isPotential
                ? 'bg-warning/10 text-warning border-warning/30'
                : 'bg-primary/10 text-primary border-primary/25'
            }`}>
              {contact.name.charAt(0)}
            </div>
            <div>
              <h2 className="font-serif text-foreground text-xl">{contact.name}</h2>
              <div className="flex gap-2 mt-1.5 flex-wrap items-center">
                <CategoryBadge category={contact.type || 'Client'} />
                <StatusBadge status={contact.status || 'Active'} />
                {isPotential && (
                  sentInfo.sent ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 size={11} />
                      Sent{sentInfo.lastSentDate ? ` · ${sentInfo.lastSentDate}` : ''}
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      To Send
                    </span>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {isPotential ? (
              <>
                <button
                  onClick={() => setIsOutreachOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-glow flex items-center gap-1.5 transition-all hover:bg-primary/90"
                >
                  <Mail size={13} />
                  <span>Email Info</span>
                </button>
                <button
                  onClick={handleEnrich}
                  disabled={enriching}
                  className="px-3 py-1.5 rounded-xl bg-card border border-border text-foreground hover:border-primary/50 font-semibold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                  title="Cross-reference with web & Instagram for contact person, complete address, and social links"
                >
                  <RefreshCw size={12} className={enriching ? 'animate-spin text-primary' : 'text-primary'} />
                  <span>{enriching ? 'Searching...' : 'Lookup / IG'}</span>
                </button>
                <button
                  onClick={handleToggleSent}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    sentInfo.sent
                      ? 'bg-card border-border text-muted-foreground hover:text-foreground'
                      : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                  }`}
                  title={sentInfo.sent ? 'Remove sent tag' : 'Mark as sent'}
                >
                  <CheckCircle2 size={12} />
                  <span>{sentInfo.sent ? 'Mark Unsent' : 'Mark Sent'}</span>
                </button>
                <button
                  onClick={handlePromoteToClient}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold text-xs flex items-center gap-1.5 transition-all hover:bg-emerald-500/25"
                  title="Promote to active Client and open New Estimate"
                >
                  <UserCheck size={13} />
                  <span>Make Estimate</span>
                </button>
              </>
            ) : contact.type === 'Client' ? (
              <button
                onClick={() => navigate(`/estimates/new?contactId=${contact.id}`)}
                className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-glow flex items-center gap-1.5 transition-all hover:bg-primary/90"
              >
                <FileText size={14} />
                <span>New Estimate</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Contact Info Cards */}
        <div className="space-y-2.5 mt-5">
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="flex items-center gap-3 p-3 bg-accent rounded-xl hover:bg-accent/80 transition-all group">
              <Phone size={16} className="text-primary" />
              <span className="text-foreground text-sm group-hover:text-primary transition-colors">{contact.phone}</span>
            </a>
          )}
          {contact.email && (
            <div className="flex items-center justify-between p-3 bg-accent rounded-xl">
              <a href={`mailto:${contact.email}`} className="flex items-center gap-3 hover:text-primary transition-colors group flex-1 min-w-0">
                <Mail size={16} className="text-primary shrink-0" />
                <span className="text-foreground text-sm group-hover:text-primary transition-colors truncate">{contact.email}</span>
              </a>
              <button
                onClick={() => setIsOutreachOpen(true)}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 flex-shrink-0 ml-2"
              >
                Draft Outreach <ArrowRight size={12} />
              </button>
            </div>
          )}
          {contact.address && (
            <div className="flex items-center gap-3 p-3 bg-accent rounded-xl">
              <MapPin size={16} className="text-muted-foreground" />
              <span className="text-foreground text-sm">{contact.address}</span>
            </div>
          )}
        </div>

        {contact.notes && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Notes & Outreach Log</p>
            <p className="text-foreground text-xs leading-relaxed whitespace-pre-wrap font-mono bg-accent/30 p-3 rounded-lg border border-border/50">
              {contact.notes}
            </p>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
          <p className="text-[10px] text-muted-foreground">Added {contact.created_at ? new Date(contact.created_at).toLocaleDateString() : 'N/A'}</p>
          <button onClick={() => setConfirmDeleteOpen(true)} className="text-[11px] text-destructive/80 hover:text-destructive font-bold uppercase tracking-widest">
            Delete Contact
          </button>
        </div>
      </div>

      <div className="flex items-start gap-2.5 p-3 bg-card/50 rounded-xl border border-border">
        <ShieldCheck size={14} className="text-primary mt-0.5 flex-shrink-0" />
        <p className="text-[10px] text-muted-foreground leading-relaxed">{PRIVACY_NOTICE}</p>
      </div>

      {/* Outreach Email Modal */}
      <OutreachEmailModal
        contact={contact}
        isOpen={isOutreachOpen}
        onClose={() => setIsOutreachOpen(false)}
      />

      {/* Edit Contact Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Edit Contact</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-3 max-h-[65vh] overflow-y-auto no-scrollbar pr-1">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Company / Full Name</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Classification</label>
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
                  <option value="Client">Client (Bids & Invoices)</option>
                  <option value="Lead">Potential Client (Outreach)</option>
                  <option value="Vendor">Vendor (Suppliers & Subs)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Status</label>
                <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none">
                  {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Phone</label>
                <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Email</label>
                <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">City, State / Site Address</label>
              <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Notes / Specialty & Pitch Angle</label>
              <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                className="w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none h-24 resize-none" />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <button type="button" onClick={() => setIsEditOpen(false)} className="px-4 py-2 rounded-lg text-muted-foreground font-bold text-[11px] uppercase tracking-widest">Cancel</button>
              <button type="submit" disabled={saveContact.isPending} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-[11px] uppercase tracking-widest shadow-glow disabled:opacity-50">
                {saveContact.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {contact.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this contact. Linked projects, estimates, and invoices will keep their history.
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

export default ContactDetail;
