import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, ChevronRight, Trash2, Mail, FileText, Sparkles, UserCheck, Briefcase, Pencil, Check, Globe, Loader2, Upload } from 'lucide-react';
import { useContacts, useSaveContact, useBatchInsertContacts, useDeleteContact, type DbContact } from '@/hooks/useContacts';
import { LEAD_BATCHES } from '@/data/seedLeads';
import { OutreachEmailModal } from '@/components/OutreachEmailModal';
import { enrichContactWithAI, getOutreachSentInfo } from '@/lib/gmail';
import { parseVerifiedLeadsCsv, planLeadSync } from '@/lib/leadSync';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type ContactType = 'Client' | 'Lead' | 'Vendor';
type FilterTab = 'Client' | 'Lead' | 'Vendor' | 'all';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: contacts = [], isLoading } = useContacts();
  const saveContact = useSaveContact();
  const batchInsert = useBatchInsertContacts();
  const deleteContactMut = useDeleteContact();

  const initialTab = ((): FilterTab => {
    const t = searchParams.get('tab');
    if (t === 'Client' || t === 'Lead' || t === 'Vendor' || t === 'all') return t;
    return 'Client';
  })();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>(initialTab);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [outreachContact, setOutreachContact] = useState<DbContact | null>(null);
  const [outreachFilter, setOutreachFilter] = useState<'all' | 'unsent' | 'sent' | 'has_email' | 'no_email'>('all');
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [isSyncingLeads, setIsSyncingLeads] = useState(false);
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'Client' || t === 'Lead' || t === 'Vendor' || t === 'all') {
      setActiveFilter(t);
    }
  }, [searchParams]);

  const selectTab = (tab: FilterTab) => {
    setActiveFilter(tab);
    setSearchParams(tab === 'Client' ? {} : { tab }, { replace: true });
  };

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

  const leadMatches = useMemo(
    () => searchMatches.filter(c => c.type === 'Lead'),
    [searchMatches],
  );

  const outreachCounts = useMemo(() => {
    let sent = 0;
    let hasEmail = 0;
    for (const c of leadMatches) {
      if (getOutreachSentInfo(c.notes).sent) sent++;
      if (c.email && c.email.trim()) hasEmail++;
    }
    return {
      all: leadMatches.length,
      sent,
      unsent: leadMatches.length - sent,
      hasEmail,
      noEmail: leadMatches.length - hasEmail,
    };
  }, [leadMatches]);

  const filteredContacts = useMemo(() => {
    const byTab = searchMatches.filter(c => activeFilter === 'all' || c.type === activeFilter);
    if (activeFilter !== 'Lead' || outreachFilter === 'all') return byTab;
    return byTab.filter(c => {
      if (outreachFilter === 'has_email') return Boolean(c.email && c.email.trim());
      if (outreachFilter === 'no_email') return !c.email || !c.email.trim();
      const isSent = getOutreachSentInfo(c.notes).sent;
      return outreachFilter === 'sent' ? isSent : !isSent;
    });
  }, [searchMatches, activeFilter, outreachFilter]);

  const contactCounts = useMemo(() => ({
    all: searchMatches.length,
    Client: searchMatches.filter(c => c.type === 'Client').length,
    Lead: leadMatches.length,
    Vendor: searchMatches.filter(c => c.type === 'Vendor').length,
  }), [searchMatches, leadMatches]);

  const backfillAllPlan = useMemo(() => {
    const allSeedLeads = LEAD_BATCHES.flatMap((b) => b.leads);
    return planLeadSync(contacts, allSeedLeads);
  }, [contacts]);

  const nextBatch = useMemo(() => {
    for (const batch of LEAD_BATCHES) {
      const plan = planLeadSync(contacts, batch.leads);
      if (plan.toInsert.length > 0 || plan.toBackfill.length > 0) {
        return { batch, missing: plan.toInsert, toBackfill: plan.toBackfill };
      }
    }
    return null;
  }, [contacts]);

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '', email: '', phone: '', address: '', notes: '',
      type: activeFilter === 'Lead' ? 'Lead' : activeFilter === 'Vendor' ? 'Vendor' : 'Client',
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

  const handleEdit = (e: React.MouseEvent, contact: DbContact) => {
    e.stopPropagation();
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
        notes: contact.notes
          ? `${contact.notes}\n[Promoted from Potential Client on ${new Date().toLocaleDateString()}]`
          : `[Promoted from Potential Client on ${new Date().toLocaleDateString()}]`,
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

  const applyLeadSyncPlan = async (
    plan: ReturnType<typeof planLeadSync>,
    sourceLabel: string,
  ) => {
    setIsSyncingLeads(true);
    try {
      let insertedCount = 0;
      let updatedCount = 0;
      if (plan.toInsert.length > 0) {
        const inserted = await batchInsert.mutateAsync(plan.toInsert);
        insertedCount = inserted.length;
      }
      for (const item of plan.toBackfill) {
        await saveContact.mutateAsync({
          ...item.existing,
          ...item.patch,
        });
        updatedCount++;
      }
      if (insertedCount === 0 && updatedCount === 0) {
        toast.info(`All leads from ${sourceLabel} are already up to date.`);
      } else {
        const parts: string[] = [];
        if (insertedCount > 0) parts.push(`added ${insertedCount} new`);
        if (updatedCount > 0) parts.push(`backfilled ${updatedCount} existing`);
        toast.success(`${sourceLabel}: ${parts.join(' & ')} verified leads!`);
      }
      selectTab('Lead');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to sync verified leads', { duration: 6000 });
    } finally {
      setIsSyncingLeads(false);
    }
  };

  const handleLoadNextBatch = async () => {
    if (batchInsert.isPending || isSyncingLeads || !nextBatch) return;
    await applyLeadSyncPlan(
      { toInsert: nextBatch.missing, toBackfill: nextBatch.toBackfill },
      nextBatch.batch.label.split(':')[0],
    );
  };

  const handleSyncVerifiedEmails = async () => {
    if (batchInsert.isPending || isSyncingLeads) return;
    if (backfillAllPlan.toBackfill.length === 0) return;
    await applyLeadSyncPlan(
      { toInsert: [], toBackfill: backfillAllPlan.toBackfill },
      'Verified Email Sync',
    );
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseVerifiedLeadsCsv(text);
      if (parsed.length === 0) {
        toast.error('No valid leads found in that CSV file.', { duration: 5000 });
        return;
      }
      const plan = planLeadSync(contacts, parsed);
      await applyLeadSyncPlan(plan, file.name);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not read CSV file', { duration: 6000 });
    }
  };

  const handleEnrichContact = async (e: React.MouseEvent, contact: DbContact) => {
    e.stopPropagation();
    if (enrichingId) return;
    setEnrichingId(contact.id);
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
      setEnrichingId(null);
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      Active: 'bg-primary/10 text-primary border-primary/25',
      Estimate: 'bg-warning/15 text-warning border-warning/30',
      Pending: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
      Inactive: 'bg-muted text-muted-foreground border-border',
    };
    return (
      <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold tracking-wider ${styles[status] || styles.Inactive}`}>
        {status}
      </span>
    );
  };

  const CategoryBadge = ({ category }: { category: string }) => {
    const isPotential = category === 'Lead';
    const label = isPotential ? 'Potential Client' : category;
    const styles: Record<string, string> = {
      Client: 'bg-primary/10 text-primary border border-primary/25',
      Lead: 'bg-warning/15 text-warning border border-warning/30',
      Vendor: 'bg-blue-500/15 text-blue-300 border border-blue-500/25',
    };
    return (
      <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${styles[category] || ''}`}>
        {label}
      </span>
    );
  };

  if (isLoading) return <div className="text-center py-20 text-muted-foreground text-sm">Loading contacts...</div>;

  const statusOptions = STATUS_BY_TYPE[formData.type];

  return (
    <div className="space-y-4 animate-fade-in pb-20 max-w-5xl mx-auto">
      <header className="flex justify-between items-center gap-2">
        <div>
          <h2 className="text-2xl font-serif text-foreground tracking-tight">Contacts & Directory</h2>
          <p className="text-muted-foreground text-[11px] uppercase tracking-widest mt-0.5 font-semibold">
            {contactCounts.Client} Clients • {contactCounts.Lead} Potential Clients
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {activeFilter === 'Lead' && (
            <>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleImportCsv}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => csvInputRef.current?.click()}
                disabled={isSyncingLeads || batchInsert.isPending}
                className="px-2.5 py-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-accent text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
                title="Import verified leads CSV from Google Drive (deduplicates & backfills missing emails)"
              >
                <Upload size={13} className="shrink-0" />
                <span className="hidden sm:inline">Import CSV</span>
              </button>
              {backfillAllPlan.toBackfill.length > 0 && (
                <button
                  type="button"
                  onClick={handleSyncVerifiedEmails}
                  disabled={isSyncingLeads || batchInsert.isPending}
                  className="px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                  title="Fill in verified emails & Sent badges on existing leads without creating duplicates"
                >
                  <Check size={14} className="shrink-0" />
                  <span>
                    {isSyncingLeads ? 'Syncing...' : `Sync Emails (${backfillAllPlan.toBackfill.length})`}
                  </span>
                </button>
              )}
              {nextBatch && (
                <button
                  type="button"
                  onClick={handleLoadNextBatch}
                  disabled={batchInsert.isPending || isSyncingLeads}
                  className="px-3 py-2 rounded-xl bg-card border border-primary/40 text-primary hover:bg-primary/10 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                  title={nextBatch.batch.description}
                >
                  <Sparkles size={14} className="text-primary shrink-0" />
                  <span className="truncate max-w-[180px] sm:max-w-none">
                    {batchInsert.isPending || isSyncingLeads
                      ? 'Syncing batch...'
                      : `Load ${nextBatch.batch.label.split(':')[0]} (+${nextBatch.missing.length + nextBatch.toBackfill.length})`}
                  </span>
                </button>
              )}
            </>
          )}
          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-primary hover:bg-accent hover:scale-105 transition-all shadow-glow shrink-0"
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2 flex-wrap">
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
            onClick={() => selectTab('Lead')}
            className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider transition-all flex items-center gap-2 ${
              activeFilter === 'Lead'
                ? 'bg-warning text-slate-950 shadow-glow'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <Mail size={14} />
            Potential Clients
            <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${activeFilter === 'Lead' ? 'bg-slate-950/15 text-slate-950' : 'bg-accent text-muted-foreground'}`}>
              {contactCounts.Lead}
            </span>
          </button>
        </div>

        {/* Secondary filters: Vendors & All */}
        <div className="flex items-center gap-1.5 self-end sm:self-center">
          <button
            onClick={() => selectTab('Vendor')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wider transition-all ${
              activeFilter === 'Vendor'
                ? 'bg-accent text-foreground border border-border font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Vendors ({contactCounts.Vendor})
          </button>
          <button
            onClick={() => selectTab('all')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wider transition-all ${
              activeFilter === 'all'
                ? 'bg-accent text-foreground border border-border font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All ({contactCounts.all})
          </button>
        </div>
      </div>

      {/* Outreach Queue Sub-Filter (Potential Clients tab only) */}
      {activeFilter === 'Lead' && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-card/60 border border-border/70 rounded-xl px-3 py-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setOutreachFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                outreachFilter === 'all'
                  ? 'bg-accent text-foreground border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All ({outreachCounts.all})
            </button>
            <button
              type="button"
              onClick={() => setOutreachFilter('has_email')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 ${
                outreachFilter === 'has_email'
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Mail size={11} />
              Has Email ({outreachCounts.hasEmail})
            </button>
            <button
              type="button"
              onClick={() => setOutreachFilter('no_email')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                outreachFilter === 'no_email'
                  ? 'bg-destructive/15 text-destructive border border-destructive/30'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Needs Email ({outreachCounts.noEmail})
            </button>
            <button
              type="button"
              onClick={() => setOutreachFilter('unsent')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                outreachFilter === 'unsent'
                  ? 'bg-warning/15 text-warning border border-warning/30'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              To Send ({outreachCounts.unsent})
            </button>
            <button
              type="button"
              onClick={() => setOutreachFilter('sent')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 ${
                outreachFilter === 'sent'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Check size={11} />
              Sent ({outreachCounts.sent})
            </button>
          </div>
          {nextBatch && (
            <span className="text-[11px] text-muted-foreground hidden md:inline">
              Next up: <strong className="text-foreground">{nextBatch.batch.label}</strong> ({nextBatch.missing.length + nextBatch.toBackfill.length} ready)
            </span>
          )}
        </div>
      )}

      {/* Contact List */}
      <div className="space-y-2">
        {filteredContacts.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-dashed border-border px-4">
            <p className="text-muted-foreground text-xs font-medium">
              {activeFilter === 'Lead'
                ? (outreachFilter === 'sent'
                    ? 'No leads marked as sent yet.'
                    : outreachFilter === 'unsent'
                      ? 'All loaded leads have been emailed! Load the next batch below.'
                      : outreachFilter === 'no_email'
                        ? 'Every loaded lead has an email address!'
                        : outreachFilter === 'has_email'
                          ? 'No leads with emails match your search.'
                          : 'No potential clients found.')
                : 'No contacts found.'}
            </p>
            {activeFilter === 'Lead' && nextBatch && (
              <button
                onClick={handleLoadNextBatch}
                disabled={batchInsert.isPending || isSyncingLeads}
                className="mt-3 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl shadow-glow inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <Sparkles size={14} />
                Load {nextBatch.batch.label} (+{nextBatch.missing.length + nextBatch.toBackfill.length})
              </button>
            )}
          </div>
        ) : (
          filteredContacts.map(contact => {
            const isPotential = contact.type === 'Lead';
            const sentInfo = isPotential ? getOutreachSentInfo(contact.notes) : { sent: false, lastSentDate: null, count: 0 };
            const isEnriching = enrichingId === contact.id;
            return (
              <div
                key={contact.id}
                onClick={() => navigate(`/contacts/${contact.id}`)}
                className="bg-card/80 border border-border rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-card hover:border-primary/30 transition-all cursor-pointer group shadow-sm"
              >
                {/* Left: Contact Info */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center font-serif font-bold text-sm border flex-shrink-0 transition-colors ${
                    isPotential
                      ? (sentInfo.sent
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-warning/10 text-warning border-warning/25')
                      : 'bg-primary/10 text-primary border-primary/25'
                  }`}>
                    {sentInfo.sent ? <Check size={16} /> : contact.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-foreground font-semibold text-sm group-hover:text-primary truncate transition-colors">
                        {contact.name}
                      </h3>
                      <CategoryBadge category={contact.type || 'Client'} />
                      {isPotential && sentInfo.sent ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border uppercase font-bold tracking-wider bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                          <Check size={10} />
                          Sent{sentInfo.lastSentDate ? ` · ${sentInfo.lastSentDate}` : ''}
                        </span>
                      ) : (
                        <StatusBadge status={contact.status || 'Active'} />
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground truncate">
                      {contact.email ? (
                        <span className="truncate">{contact.email}</span>
                      ) : (
                        isPotential && <span className="text-warning/80 italic">No email yet</span>
                      )}
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

                {/* Right: Contextual Quick Actions */}
                <div className="flex items-center gap-1.5 sm:self-center self-end flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 w-full sm:w-auto justify-end flex-wrap">
                  {isPotential && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => handleEnrichContact(e, contact)}
                        disabled={!!enrichingId}
                        className="px-2.5 py-1.5 rounded-lg bg-accent/70 hover:bg-accent text-foreground border border-border text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
                        title="Cross-reference on Web & Instagram for email, phone, full address & IG handle"
                      >
                        {isEnriching ? <Loader2 size={13} className="animate-spin text-primary" /> : <Globe size={13} className="text-primary" />}
                        <span>{isEnriching ? 'Checking...' : 'Lookup / IG'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOutreachContact(contact);
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          sentInfo.sent
                            ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-primary/10 hover:bg-primary/20 text-primary border-primary/25'
                        }`}
                        title="Draft email & open in Gmail"
                      >
                        <Mail size={13} />
                        <span>{sentInfo.sent ? 'Follow Up' : 'Email Info'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handlePromoteToClient(e, contact)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                        title="Promote to Client and create estimate"
                      >
                        <UserCheck size={13} />
                        <span>Make Estimate</span>
                      </button>
                    </>
                  )}

                  {!isPotential && contact.type === 'Client' && (
                    <button
                      type="button"
                      onClick={(e) => handleCreateEstimate(e, contact.id)}
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
          <form onSubmit={handleSubmit} className="space-y-3 max-h-[65vh] overflow-y-auto no-scrollbar pr-1">
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
                className="w-full bg-accent border border-border rounded-lg p-2.5 text-xs text-foreground outline-none h-20 resize-none" />
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
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 rounded-lg text-muted-foreground font-bold text-[11px] uppercase tracking-widest">Cancel</button>
                <button type="submit" disabled={saveContact.isPending} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-[11px] uppercase tracking-widest shadow-glow disabled:opacity-50">
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
