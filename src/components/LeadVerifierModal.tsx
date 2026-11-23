import React, { useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ClipboardPaste,
  Globe,
  Loader2,
  MailCheck,
  Search,
  ShieldAlert,
  Square,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useBatchInsertContacts,
  useSaveContact,
  type DbContact,
} from '@/hooks/useContacts';
import { isJunkBusinessEmail, planLeadSync } from '@/lib/leadSync';
import {
  parseRawLeadText,
  verifiedResultToSeedLead,
  verifySingleLead,
  type RawLeadCandidate,
  type VerifiedLeadResult,
} from '@/lib/leadVerifier';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: DbContact[];
}

type ModalTab = 'paste' | 'missing';

export const LeadVerifierModal: React.FC<Props> = ({ open, onOpenChange, contacts }) => {
  const saveContact = useSaveContact();
  const batchInsert = useBatchInsertContacts();

  const [tab, setTab] = useState<ModalTab>('paste');
  const [rawText, setRawText] = useState('');
  const [results, setResults] = useState<VerifiedLeadResult[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedMissingIds, setSelectedMissingIds] = useState<Set<string>>(new Set());
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; label: string } | null>(null);
  const cancelRef = useRef(false);

  const parsedCandidates = useMemo(() => parseRawLeadText(rawText), [rawText]);

  const missingEmailLeads = useMemo(
    () =>
      contacts.filter(
        (c) => c.type === 'Lead' && (!c.email || !c.email.trim() || isJunkBusinessEmail(c.email)),
      ),
    [contacts],
  );

  const toggleResultSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleMissingSelected = (id: string) => {
    setSelectedMissingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runVerificationBatch = async (candidates: RawLeadCandidate[]) => {
    if (candidates.length === 0 || isRunning) return;
    cancelRef.current = false;
    setIsRunning(true);
    setResults([]);
    setSelectedIds(new Set());

    const collected: VerifiedLeadResult[] = [];
    const autoSelect = new Set<string>();

    for (let i = 0; i < candidates.length; i++) {
      if (cancelRef.current) break;
      const cand = candidates[i];
      setProgress({ current: i + 1, total: candidates.length, label: cand.name });

      const res = await verifySingleLead(cand, contacts);
      collected.push(res);
      if (res.syncAction === 'new' || res.syncAction === 'update') {
        autoSelect.add(res.id);
      }
      setResults([...collected]);
      setSelectedIds(new Set(autoSelect));
    }

    setIsRunning(false);
    setProgress(null);

    const verifiedCount = collected.filter(
      (r) => r.verificationStatus === 'verified_website' || r.verificationStatus === 'mx_valid',
    ).length;
    const blockedCount = collected.filter((r) => Boolean(r.rejectedEmail)).length;
    if (cancelRef.current) {
      toast.info(`Stopped after checking ${collected.length} of ${candidates.length} leads.`);
    } else {
      toast.success(
        `Checked ${collected.length} leads: ${verifiedCount} email-ready${blockedCount ? `, ${blockedCount} bogus blocked` : ''}.`,
      );
    }
  };

  const handleVerifyPasted = async () => {
    await runVerificationBatch(parsedCandidates);
  };

  const handleVerifyMissing = async () => {
    const targets =
      selectedMissingIds.size > 0
        ? missingEmailLeads.filter((c) => selectedMissingIds.has(c.id))
        : missingEmailLeads;
    if (targets.length === 0) return;

    const candidates: RawLeadCandidate[] = targets.map((c) => {
      const siteMatch = (c.notes || '').match(/Website:\s*(https?:\/\/[^\s|]+|[a-z0-9.-]+\.[a-z]{2,})/i);
      const igMatch = (c.notes || '').match(/IG:\s*(@[a-zA-Z0-9._]+)/i);
      return {
        name: c.name,
        email: c.email && !isJunkBusinessEmail(c.email) ? c.email : null,
        rejectedEmail: c.email && isJunkBusinessEmail(c.email) ? c.email : null,
        phone: c.phone,
        address: c.address,
        website: siteMatch
          ? /^https?:\/\//i.test(siteMatch[1])
            ? siteMatch[1]
            : `https://${siteMatch[1]}`
          : null,
        instagram: igMatch ? igMatch[1] : null,
        notes: null,
      };
    });
    await runVerificationBatch(candidates);
  };

  const handleStop = () => {
    cancelRef.current = true;
  };

  const handleSaveSelected = async () => {
    const chosen = results.filter((r) => selectedIds.has(r.id));
    if (chosen.length === 0 || isSaving) return;
    setIsSaving(true);
    try {
      const incoming = chosen.map(verifiedResultToSeedLead);
      const plan = planLeadSync(contacts, incoming);

      // Also apply IG/website/notes updates for existing contacts matched by existingContactId
      const backfilledIds = new Set(plan.toBackfill.map((b) => b.existing.id));
      let insertedCount = 0;
      let updatedCount = 0;

      if (plan.toInsert.length > 0) {
        const inserted = await batchInsert.mutateAsync(plan.toInsert);
        insertedCount = inserted.length;
      }

      for (const item of plan.toBackfill) {
        const matchedResult = chosen.find((r) => r.existingContactId === item.existing.id);
        let mergedNotes = item.patch.notes || '';
        if (matchedResult) {
          const extras: string[] = [];
          if (matchedResult.instagram && !mergedNotes.toLowerCase().includes(matchedResult.instagram.toLowerCase())) {
            extras.push(`IG: ${matchedResult.instagram}`);
          }
          if (
            matchedResult.website &&
            !mergedNotes.toLowerCase().includes(matchedResult.website.replace(/^https?:\/\//i, '').toLowerCase())
          ) {
            extras.push(`Website: ${matchedResult.website}`);
          }
          if (extras.length > 0) {
            mergedNotes = mergedNotes ? `${mergedNotes}\n[Verified: ${extras.join(' | ')}]` : `[Verified: ${extras.join(' | ')}]`;
          }
        }
        await saveContact.mutateAsync({
          ...item.existing,
          ...item.patch,
          notes: mergedNotes || null,
        });
        updatedCount++;
      }

      // Apply website/IG-only enrichments for existing contacts that didn't change email/phone/address
      for (const r of chosen) {
        if (r.syncAction !== 'update' || !r.existingContactId || backfilledIds.has(r.existingContactId)) continue;
        const existing = contacts.find((c) => c.id === r.existingContactId);
        if (!existing) continue;
        const existingNotes = existing.notes || '';
        const extras: string[] = [];
        if (r.instagram && !existingNotes.toLowerCase().includes(r.instagram.toLowerCase())) {
          extras.push(`IG: ${r.instagram}`);
        }
        if (
          r.website &&
          !existingNotes.toLowerCase().includes(r.website.replace(/^https?:\/\//i, '').replace(/\/$/, '').toLowerCase())
        ) {
          extras.push(`Website: ${r.website}`);
        }
        if (extras.length === 0) continue;
        await saveContact.mutateAsync({
          ...existing,
          notes: existingNotes ? `${existingNotes}\n[Verified: ${extras.join(' | ')}]` : `[Verified: ${extras.join(' | ')}]`,
        });
        updatedCount++;
      }

      if (insertedCount === 0 && updatedCount === 0) {
        toast.info('Selected leads are already up to date in Contacts.');
      } else {
        const parts: string[] = [];
        if (insertedCount > 0) parts.push(`added ${insertedCount} new`);
        if (updatedCount > 0) parts.push(`updated ${updatedCount} existing`);
        toast.success(`Saved to Contacts: ${parts.join(' & ')}!`);
      }
      setResults([]);
      setRawText('');
      setSelectedIds(new Set());
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save verified leads', { duration: 6000 });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCount = selectedIds.size;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isRunning) onOpenChange(v); }}>
      <DialogContent className="bg-card border-border text-foreground max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <DialogTitle className="font-serif text-xl flex items-center gap-2">
            <MailCheck size={18} className="text-primary" />
            Self-Serve Lead Verifier
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Scrapes live company websites &amp; /contact pages, checks live DNS MX mail servers, blocks staging/junk emails, and saves straight to Contacts with zero duplicates.
          </p>

          <div className="flex gap-1.5 pt-2">
            <button
              type="button"
              disabled={isRunning}
              onClick={() => { setTab('paste'); setResults([]); }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                tab === 'paste'
                  ? 'bg-primary/15 border-primary/40 text-primary'
                  : 'bg-background border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <ClipboardPaste size={13} /> Paste from Gemini / Doc
            </button>
            <button
              type="button"
              disabled={isRunning}
              onClick={() => { setTab('missing'); setResults([]); }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                tab === 'missing'
                  ? 'bg-primary/15 border-primary/40 text-primary'
                  : 'bg-background border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <Search size={13} /> Missing Emails ({missingEmailLeads.length})
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {tab === 'paste' && (
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                Paste companies, Gemini output, or Doc notes (any format)
              </label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                disabled={isRunning}
                rows={5}
                placeholder={`Examples:\n- Cliff Wright Design | OKC | cliffwrightdesign.com\n- Snyder Construction Group, Springfield MO\n- Balm Interiors — Oklahoma City — hello@balminteriors.com`}
                className="w-full rounded-xl bg-background border border-border p-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary resize-y font-mono"
              />
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  {parsedCandidates.length === 0
                    ? 'Paste 1 or more companies above to begin.'
                    : `Detected ${parsedCandidates.length} unique ${parsedCandidates.length === 1 ? 'company' : 'companies'} ready to verify.`}
                </span>
                <div className="flex items-center gap-2">
                  {isRunning ? (
                    <button
                      type="button"
                      onClick={handleStop}
                      className="px-3 py-1.5 rounded-lg bg-destructive/15 border border-destructive/40 text-destructive text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Square size={12} /> Stop
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={parsedCandidates.length === 0}
                      onClick={handleVerifyPasted}
                      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
                    >
                      <Sparkles size={13} /> Verify &amp; Check MX ({parsedCandidates.length})
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'missing' && (
            <div className="space-y-3">
              {missingEmailLeads.length === 0 ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center text-xs text-emerald-300">
                  All of your current Leads already have valid emails!
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      Select leads to run live website + /contact + MX lookup on (or leave unchecked to run all {missingEmailLeads.length}).
                    </span>
                    <div className="flex items-center gap-2">
                      {isRunning ? (
                        <button
                          type="button"
                          onClick={handleStop}
                          className="px-3 py-1.5 rounded-lg bg-destructive/15 border border-destructive/40 text-destructive text-xs font-semibold flex items-center gap-1.5"
                        >
                          <Square size={12} /> Stop
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleVerifyMissing}
                          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5"
                        >
                          <Globe size={13} /> Verify{' '}
                          {selectedMissingIds.size > 0
                            ? `${selectedMissingIds.size} Selected`
                            : `All ${missingEmailLeads.length}`}
                        </button>
                      )}
                    </div>
                  </div>

                  {results.length === 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                      {missingEmailLeads.map((c) => {
                        const checked = selectedMissingIds.has(c.id);
                        return (
                          <label
                            key={c.id}
                            className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs cursor-pointer transition-colors ${
                              checked
                                ? 'bg-primary/10 border-primary/40 text-foreground'
                                : 'bg-background border-border text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={isRunning}
                              onChange={() => toggleMissingSelected(c.id)}
                              className="accent-primary"
                            />
                            <span className="truncate font-medium">{c.name}</span>
                            {c.address && (
                              <span className="text-[10px] text-muted-foreground ml-auto shrink-0 truncate max-w-[90px]">
                                {c.address}
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {progress && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-primary flex items-center gap-1.5 truncate">
                  <Loader2 size={13} className="animate-spin shrink-0" />
                  Checking {progress.current} of {progress.total}: {progress.label}
                </span>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {Math.round((progress.current / progress.total) * 100)}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-background overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Verification Results ({results.length})
                </span>
                <div className="flex gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set(results.filter((r) => r.syncAction !== 'duplicate').map((r) => r.id)))}
                    className="text-primary hover:underline"
                  >
                    Select actionable
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    className="text-muted-foreground hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {results.map((r) => {
                  const checked = selectedIds.has(r.id);
                  const badgeClass =
                    r.verificationStatus === 'verified_website'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : r.verificationStatus === 'mx_valid'
                        ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                        : r.verificationStatus === 'error'
                          ? 'bg-destructive/15 text-destructive border-destructive/30'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30';

                  const syncBadge =
                    r.syncAction === 'new'
                      ? { text: 'New Lead', cls: 'bg-primary/15 text-primary border-primary/30' }
                      : r.syncAction === 'update'
                        ? { text: 'Updates Existing', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' }
                        : { text: 'Already Synced', cls: 'bg-muted text-muted-foreground border-border' };

                  return (
                    <div
                      key={r.id}
                      onClick={() => toggleResultSelected(r.id)}
                      className={`rounded-xl border p-3 text-xs cursor-pointer transition-colors ${
                        checked
                          ? 'bg-primary/5 border-primary/40'
                          : 'bg-background border-border hover:border-border/80'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {}}
                          className="mt-0.5 accent-primary"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-bold text-foreground truncate">{r.name}</span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${syncBadge.cls}`}>
                                {syncBadge.text}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${badgeClass}`}>
                                {r.verificationStatus === 'verified_website'
                                  ? 'Verified (Site + MX)'
                                  : r.verificationStatus === 'mx_valid'
                                    ? 'MX Valid'
                                    : r.verificationStatus === 'error'
                                      ? 'Lookup Error'
                                      : 'Web Form / IG'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
                            {r.email ? (
                              <span className="text-emerald-400 font-medium flex items-center gap-1">
                                <CheckCircle2 size={11} /> {r.email}
                              </span>
                            ) : (
                              <span className="text-amber-300/90">No verified public email</span>
                            )}
                            {r.phone && <span>{r.phone}</span>}
                            {r.address && <span>{r.address}</span>}
                            {r.instagram && <span className="text-primary">{r.instagram}</span>}
                          </div>

                          {r.rejectedEmail && (
                            <div className="text-[10px] text-destructive flex items-center gap-1">
                              <ShieldAlert size={11} /> Blocked bogus/unverified email: {r.rejectedEmail}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border bg-background/60 flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={isRunning || isSaving}
            onClick={() => onOpenChange(false)}
            className="px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            Close
          </button>
          <button
            type="button"
            disabled={isRunning || isSaving || selectedCount === 0}
            onClick={handleSaveSelected}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
          >
            {isSaving ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Saving...
              </>
            ) : (
              <>
                {selectedCount > 0 ? <UserPlus size={13} /> : <Check size={13} />}
                Save Selected to Contacts ({selectedCount})
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
