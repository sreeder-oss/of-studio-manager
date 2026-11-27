import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  ChevronRight,
  Download,
  Globe,
  Loader2,
  Mail,
  MailCheck,
  Pencil,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useBatchInsertContacts,
  useContacts,
  useDeleteContact,
  useSaveContact,
  type DbContact,
} from '@/hooks/useContacts';
import { LEAD_BATCHES } from '@/data/seedLeads';
import { OutreachEmailModal } from '@/components/OutreachEmailModal';
import { LeadVerifierModal, type VerifierModalTab } from '@/components/LeadVerifierModal';
import { enrichContactWithAI, getOutreachSentInfo } from '@/lib/gmail';
import { parseVerifiedLeadsCsv, planLeadSync } from '@/lib/leadSync';
import { buildVerifiedLeadsCsv } from '@/lib/leadVerifier';
import { filterOutreachLeads } from '@/lib/contactFilters';
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

const LEAD_STATUSES = ['Pending', 'Active', 'Inactive'];
const isValidEmail = (v: string) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const Outreach: React.FC = () => {
  const navigate = useNavigate();
  const { data: contacts = [], isLoading } = useContacts();
  const saveContact = useSaveContact();
  const batchInsert = useBatchInsertContacts();
  const deleteContactMut = useDeleteContact();

  const [searchTerm, setSearchTerm] = useState('');
  const [outreachFilter, setOutreachFilter] = useState<'all' | 'unsent' | 'sent' | 'has_email' | 'no_email'>('all');
  const [outreachContact, setOutreachContact] = useState<DbContact | null>(null);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [isSyncingLeads, setIsSyncingLeads] = useState(false);
  const [verifierOpen, setVerifierOpen] = useState(false);
  const [verifierInitialTab, setVerifierInitialTab] = useState<VerifierModalTab>('paste');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    status: 'Pending',
  });

  const openVerifier = (initialTab: VerifierModalTab) => {
    setVerifierInitialTab(initialTab);
    setVerifierOpen(true);
  };

  const leadMatches = useMemo(
    () => filterOutreachLeads(contacts, searchTerm),
    [contacts, searchTerm],
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

  const filteredLeads = useMemo(() => {
    if (outreachFilter === 'all') return leadMatches;
    return leadMatches.filter((c) => {
      if (outreachFilter === 'has_email') return Boolean(c.email && c.email.trim());
      if (outreachFilter === 'no_email') return !c.email || !c.email.trim();
      const isSent = getOutreachSentInfo(c.notes).sent;
      return outreachFilter === 'sent' ? isSent : !isSent;
    });
  }, [leadMatches, outreachFilter]);

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
      name: '',
      email: '',
      phone: '',
      address: '',
      notes: '',
      status: 'Pending',
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
      toast.error('Company / Lead name is required');
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
        type: 'Lead',
        status: formData.status,
      });
      toast.success(editingId ? 'Lead updated' : 'Lead added to Outreach');
      handleCloseModal();
    } catch {
      // global toast
    }
  };

  const handleEdit = (e: React.MouseEvent, contact: DbContact) => {
    e.stopPropagation();
    setFormData({
      name: contact.name,
      email: contact.email || '',
      phone: contact.phone || '',
      address: contact.address || '',
      notes: contact.notes || '',
      status: contact.status || 'Pending',
    });
    setEditingId(contact.id);
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await deleteContactMut.mutateAsync(pendingDeleteId);
      toast.success('Lead deleted');
      setPendingDeleteId(null);
      handleCloseModal();
    } catch {
      // global toast
    }
  };

  const handleConvertToClient = async (e: React.MouseEvent, contact: DbContact) => {
    e.stopPropagation();
    try {
      await saveContact.mutateAsync({
        ...contact,
        type: 'Client',
        status: 'Active',
        notes: contact.notes
          ? `${contact.notes}\n[Converted from Outreach on ${new Date().toLocaleDateString()}]`
          : `[Converted from Outreach on ${new Date().toLocaleDateString()}]`,
      });
      toast.success(`${contact.name} converted to Active Client (moved to Contacts)`);
    } catch {
      toast.error('Failed to convert lead');
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
          ? `${contact.notes}\n[Promoted from Outreach on ${new Date().toLocaleDateString()}]`
          : `[Promoted from Outreach on ${new Date().toLocaleDateString()}]`,
      });
      toast.success(`${contact.name} promoted to Client! Opening Estimate...`);
      navigate(`/estimates/new?contactId=${contact.id}`);
    } catch {
      toast.error('Failed to promote lead');
    }
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

  const handleExportLeadsCsv = () => {
    const leadsOnly = contacts.filter((c) => c.type === 'Lead');
    if (leadsOnly.length === 0) {
      toast.info('No leads to export yet.');
      return;
    }
    const csv = buildVerifiedLeadsCsv(leadsOnly);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `organic-finishes-verified-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${leadsOnly.length} leads to CSV`);
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

  if (isLoading) return <div className="text-center py-20 text-muted-foreground text-sm">Loading outreach leads...</div>;

  return (
    <div className="space-y-4 animate-fade-in pb-20 max-w-5xl mx-auto">
      <header className="flex justify-between items-center gap-2 flex-wrap">
        <div>
          <h2 className="text-2xl font-serif text-foreground tracking-tight flex items-center gap-2">
            <Send size={20} className="text-primary" />
            Outreach Hub
          </h2>
          <p className="text-muted-foreground text-[11px] uppercase tracking-widest mt-0.5 font-semibold">
            {outreachCounts.all} Prospects • {outreachCounts.hasEmail} Email Ready • Separate from Active Clients
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleImportCsv}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => openVerifier('paste')}
            disabled={isSyncingLeads || batchInsert.isPending}
            className="px-3 py-2 rounded-xl bg-primary/15 border border-primary/40 text-primary hover:bg-primary/25 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
            title="Paste raw leads from Gemini/Doc or verify existing leads missing emails (live /contact scrape + DNS MX)"
          >
            <MailCheck size={14} className="shrink-0" />
            <span>Verify Leads</span>
          </button>
          {outreachCounts.noEmail > 0 && (
            <button
              type="button"
              onClick={() => openVerifier('missing')}
              disabled={isSyncingLeads || batchInsert.isPending}
              className="px-2.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
              title="Jump directly to Missing Emails live enrichment"
            >
              <Globe size={13} className="shrink-0" />
              <span>Enrich Missing ({outreachCounts.noEmail})</span>
            </button>
          )}
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
          <button
            type="button"
            onClick={handleExportLeadsCsv}
            disabled={outreachCounts.all === 0}
            className="px-2.5 py-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-accent text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
            title="Export verified leads CSV backup for Google Drive"
          >
            <Download size={13} className="shrink-0" />
            <span className="hidden md:inline">Export CSV</span>
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
          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-primary hover:bg-accent hover:scale-105 transition-all shadow-glow shrink-0"
            aria-label="Add outreach lead"
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
          placeholder="Search outreach prospects by firm, email, city, or specialty..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-card border border-border rounded-xl py-2.5 pl-12 pr-4 text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground text-xs"
        />
      </div>

      {/* KPI Strip + Queue Sub-Filter */}
      <div className="space-y-2.5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => setOutreachFilter('all')}
            className={`rounded-xl border px-3 py-2 text-left transition-all ${
              outreachFilter === 'all'
                ? 'bg-card border-primary/40'
                : 'bg-card/60 border-border/70 hover:border-border'
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Leads</div>
            <div className="text-lg font-bold tabular-nums text-foreground mt-0.5">{outreachCounts.all}</div>
          </button>
          <button
            type="button"
            onClick={() => setOutreachFilter('has_email')}
            className={`rounded-xl border px-3 py-2 text-left transition-all ${
              outreachFilter === 'has_email'
                ? 'bg-emerald-500/10 border-emerald-500/40'
                : 'bg-card/60 border-border/70 hover:border-border'
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email Ready</div>
            <div className="text-lg font-bold tabular-nums text-emerald-400 mt-0.5">{outreachCounts.hasEmail}</div>
          </button>
          <button
            type="button"
            onClick={() => setOutreachFilter('no_email')}
            className={`rounded-xl border px-3 py-2 text-left transition-all ${
              outreachFilter === 'no_email'
                ? 'bg-amber-500/10 border-amber-500/40'
                : 'bg-card/60 border-border/70 hover:border-border'
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Missing Email</div>
            <div className="text-lg font-bold tabular-nums text-amber-300 mt-0.5">{outreachCounts.noEmail}</div>
          </button>
          <button
            type="button"
            onClick={() => setOutreachFilter('sent')}
            className={`rounded-xl border px-3 py-2 text-left transition-all ${
              outreachFilter === 'sent'
                ? 'bg-primary/10 border-primary/40'
                : 'bg-card/60 border-border/70 hover:border-border'
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sent</div>
            <div className="text-lg font-bold tabular-nums text-primary mt-0.5">{outreachCounts.sent}</div>
          </button>
        </div>

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
      </div>

      {/* Lead Cards */}
      <div className="space-y-2">
        {filteredLeads.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-dashed border-border px-4">
            <p className="text-muted-foreground text-xs font-medium">
              {outreachFilter === 'sent'
                ? 'No leads marked as sent yet.'
                : outreachFilter === 'unsent'
                  ? 'All loaded leads have been emailed! Load the next batch below.'
                  : outreachFilter === 'no_email'
                    ? 'Every loaded lead has an email address!'
                    : outreachFilter === 'has_email'
                      ? 'No leads with emails match your search.'
                      : 'No outreach prospects yet.'}
            </p>
            {nextBatch && (
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
          filteredLeads.map((contact) => {
            const sentInfo = getOutreachSentInfo(contact.notes);
            const isEnriching = enrichingId === contact.id;
            return (
              <div
                key={contact.id}
                onClick={() => navigate(`/contacts/${contact.id}`)}
                className="bg-card/80 border border-border rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-card hover:border-primary/30 transition-all cursor-pointer group shadow-sm"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center font-serif font-bold text-sm border flex-shrink-0 transition-colors ${
                      sentInfo.sent
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-warning/10 text-warning border-warning/25'
                    }`}
                  >
                    {sentInfo.sent ? <Check size={16} /> : contact.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-foreground font-semibold text-sm group-hover:text-primary truncate transition-colors">
                        {contact.name}
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider bg-warning/15 text-warning border border-warning/30">
                        Outreach Lead
                      </span>
                      {sentInfo.sent && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border uppercase font-bold tracking-wider bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                          <Check size={10} />
                          Sent{sentInfo.lastSentDate ? ` · ${sentInfo.lastSentDate}` : ''}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground truncate">
                      {contact.email ? (
                        <span className="truncate">{contact.email}</span>
                      ) : (
                        <span className="text-warning/80 italic">No email yet</span>
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

                <div className="flex items-center gap-1.5 sm:self-center self-end flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 w-full sm:w-auto justify-end flex-wrap">
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
                    onClick={(e) => handleConvertToClient(e, contact)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#d9a441]/12 hover:bg-[#d9a441]/22 text-[#d9a441] border border-[#d9a441]/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                    title="Convert to Active Client (keeps email history & moves to Contacts)"
                  >
                    <UserCheck size={13} />
                    <span>To Client</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handlePromoteToClient(e, contact)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                    title="Promote to Client and create estimate"
                  >
                    <UserCheck size={13} />
                    <span>Promote → Estimate</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleEdit(e, contact)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                    title="Edit lead"
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

      {/* Add / Edit Lead Modal */}
      <Dialog open={isModalOpen} onOpenChange={(o) => (o ? setIsModalOpen(true) : handleCloseModal())}>
        <DialogContent className="bg-card border-border text-foreground max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">{editingId ? 'Edit Outreach Lead' : 'New Outreach Lead'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Company / Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-accent border border-border rounded-lg p-2.5 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-accent border border-border rounded-lg p-2.5 text-foreground text-xs outline-none"
              >
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
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
              <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">City / Address</label>
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
                  aria-label="Delete lead"
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
            <AlertDialogTitle>Delete this outreach lead?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the lead from Outreach.
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

      {/* Self-Serve Lead Verifier Modal */}
      <LeadVerifierModal
        open={verifierOpen}
        initialTab={verifierInitialTab}
        onOpenChange={setVerifierOpen}
        contacts={contacts}
      />
    </div>
  );
};

export default Outreach;
