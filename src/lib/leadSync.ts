import type { SeedLead } from '@/data/seedLeads';

const JUNK_EMAIL_DOMAINS = new Set([
  'sg-host.com',
  'wixpress.com',
  'wix.com',
  'sentry.io',
  'sentry-next.wixpress.com',
  'squarespace.com',
  'godaddy.com',
  'example.com',
  'test.com',
  'domain.com',
  'email.com',
  'yoursite.com',
  'yourdomain.com',
  'wordpress.com',
  'wordpress.org',
  'w3.org',
  'schema.org',
  'cloudflare.com',
  'googleapis.com',
  'gstatic.com',
  'google.com',
  'facebook.com',
  'instagram.com',
  'twitter.com',
  'x.com',
  'youtube.com',
  'linkedin.com',
  'houzz.com',
  'pinterest.com',
  'tiktok.com',
  'amazonaws.com',
  'ueniweb.com',
]);

const BAD_LOCAL_PARTS =
  /^(no-?reply|donotreply|bounce|mailer-daemon|postmaster|abuse|privacy|legal|dmca|security|webmaster|hostmaster|root|unsubscribe|notifications?|alerts?|support|helpdesk|careers|jobs|hr|recruiting|press|media|pr|spam|example|user|name|yourname|someone)$/i;

const IMAGE_OR_ASSET_EXT = /\.(png|jpe?g|gif|svg|webp|ico|css|js|woff2?|ttf|eot|pdf|mp4|webm)$/i;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}/g;

export function isJunkBusinessEmail(email?: string | null): boolean {
  if (!email) return true;
  const e = email.trim().toLowerCase();
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,24}$/.test(e)) return true;
  if (IMAGE_OR_ASSET_EXT.test(e)) return true;
  const [local, domain] = e.split('@');
  if (!local || !domain) return true;
  if (BAD_LOCAL_PARTS.test(local)) return true;
  if (JUNK_EMAIL_DOMAINS.has(domain)) return true;
  for (const junk of JUNK_EMAIL_DOMAINS) {
    if (domain.endsWith(`.${junk}`)) return true;
  }
  return false;
}

export function extractVerifiedEmailsFromText(text: string, preferredDomain?: string | null): string[] {
  if (!text) return [];
  const matches = text.match(EMAIL_REGEX) || [];
  const unique = new Set<string>();
  for (const m of matches) {
    const cleaned = m.trim().toLowerCase();
    if (!isJunkBusinessEmail(cleaned)) {
      unique.add(cleaned);
    }
  }
  const dom = (preferredDomain || '')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];

  return [...unique].sort((a, b) => {
    const score = (email: string) => {
      const [local, d] = email.split('@');
      let s = 0;
      if (dom && (d === dom || d.endsWith(`.${dom}`))) s += 100;
      if (/^(estimating|bids|bidding|precon|proposals)$/i.test(local)) s += 50;
      if (/^(info|hello|contact|office|design|studio|inquiries|projects|sales)$/i.test(local)) s += 35;
      return s;
    };
    return score(b) - score(a);
  });
}

export function normalizeLeadPhone(phone?: string | null): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return digits.length >= 10 ? digits.slice(0, 10) : '';
}

export function normalizeLeadName(name?: string | null): string {
  return String(name || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(llc|inc\.?|corp\.?|corporation|co\.?|ltd\.?)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export interface SyncableContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  type: string;
  status: string;
}

export interface BackfillUpdate {
  existing: SyncableContact;
  patch: {
    email: string | null;
    phone: string | null;
    address: string | null;
    notes: string | null;
    status: string;
  };
  addedFields: string[];
}

/**
 * Matches incoming verified leads against existing contacts by normalized phone
 * or normalized company name. Existing leads with missing/junk emails are queued
 * for non-destructive backfill instead of creating duplicates.
 */
export function planLeadSync(
  existingContacts: SyncableContact[],
  incomingLeads: SeedLead[],
): { toInsert: SeedLead[]; toBackfill: BackfillUpdate[] } {
  const byPhone = new Map<string, SyncableContact>();
  const byName = new Map<string, SyncableContact>();

  for (const c of existingContacts) {
    const p = normalizeLeadPhone(c.phone);
    if (p && !byPhone.has(p)) byPhone.set(p, c);
    const n = normalizeLeadName(c.name);
    if (n && !byName.has(n)) byName.set(n, c);
  }

  const toInsert: SeedLead[] = [];
  const toBackfill: BackfillUpdate[] = [];
  const seenExistingIds = new Set<string>();
  const seenInsertKeys = new Set<string>();

  for (const lead of incomingLeads) {
    const phoneKey = normalizeLeadPhone(lead.phone);
    const nameKey = normalizeLeadName(lead.name);
    const isBranch = /—/.test(lead.name);

    const matched =
      (isBranch ? byName.get(nameKey) : undefined) ||
      (!isBranch && phoneKey ? byPhone.get(phoneKey) : undefined) ||
      byName.get(nameKey);

    if (!matched) {
      const dedupeKey = (!isBranch && phoneKey) || nameKey;
      if (!dedupeKey || seenInsertKeys.has(dedupeKey)) continue;
      seenInsertKeys.add(dedupeKey);
      toInsert.push(lead);
      continue;
    }

    if (seenExistingIds.has(matched.id)) continue;

    const addedFields: string[] = [];
    const existingEmailBad = !matched.email || isJunkBusinessEmail(matched.email);
    const incomingEmailGood = Boolean(lead.email && !isJunkBusinessEmail(lead.email));

    const nextEmail = existingEmailBad && incomingEmailGood ? lead.email : matched.email;
    if (nextEmail !== matched.email && nextEmail) addedFields.push('email');

    const nextPhone = !matched.phone && lead.phone ? lead.phone : matched.phone;
    if (nextPhone !== matched.phone && nextPhone) addedFields.push('phone');

    const nextAddress =
      lead.address && (!matched.address || lead.address.length > matched.address.length + 5)
        ? lead.address
        : matched.address;
    if (nextAddress !== matched.address && nextAddress) addedFields.push('address');

    let nextNotes = matched.notes || '';
    const incomingSent = Boolean(lead.notes && /\[Sent\b/i.test(lead.notes));
    const existingSent = /\[(?:AI )?Outreach: Emailed|\[Sent\b/i.test(nextNotes);
    if (incomingSent && !existingSent) {
      nextNotes = nextNotes ? `${nextNotes}\n[Sent via Company/Website Doc]` : '[Sent via Company/Website Doc]';
      addedFields.push('sent status');
    }

    const nextStatus = incomingSent && matched.status === 'Pending' ? 'Active' : matched.status;

    if (addedFields.length > 0) {
      seenExistingIds.add(matched.id);
      toBackfill.push({
        existing: matched,
        patch: {
          email: nextEmail,
          phone: nextPhone,
          address: nextAddress,
          notes: nextNotes || null,
          status: nextStatus,
        },
        addedFields,
      });
    }
  }

  return { toInsert, toBackfill };
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field.trim());
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field.trim());
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field || row.length) {
    row.push(field.trim());
    if (row.some((c) => c !== '')) rows.push(row);
  }
  return rows;
}

/**
 * Parses a CSV exported from the Drive "Master Verified Outreach Leads" sheet
 * (or any standard lead tracker CSV) into SeedLead entries.
 */
export function parseVerifiedLeadsCsv(csvText: string): SeedLead[] {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.toLowerCase());
  const get = (row: string[], pat: RegExp) => {
    const idx = headers.findIndex((h) => pat.test(h));
    return idx >= 0 ? (row[idx] || '').trim() : '';
  };

  return rows
    .slice(1)
    .map((row): SeedLead | null => {
      const name = get(row, /company|firm|name/);
      if (!name) return null;

      const emailRaw = get(row, /verified email|direct email|email/);
      const contactRaw = get(row, /contact.*phone|contact person|key contact/);
      const phoneRaw = get(row, /^phone$/);
      const city = get(row, /city|region|state|address/);
      const category = get(row, /category|segment/);
      const website = get(row, /website/);
      const instagram = get(row, /instagram/);
      const credibility = get(row, /credibility|verification/);
      const statusRaw = get(row, /status/);
      const notesRaw = get(row, /notes|specialty|pitch/);

      const extractedEmails = extractVerifiedEmailsFromText(`${emailRaw} ${contactRaw}`);
      const email = extractedEmails[0] || null;

      const phoneMatch = `${phoneRaw} ${contactRaw}`.match(/(\d{3}[-.\s]\d{3}[-.\s]\d{4})/);
      const phone = phoneMatch ? phoneMatch[1] : phoneRaw || null;

      const isSent = /\bsent\b/i.test(statusRaw);
      const noteParts: string[] = [];
      if (category) noteParts.push(`Category: ${category}`);
      if (credibility) noteParts.push(`Email Status: ${credibility}`);
      if (website) noteParts.push(`Website: ${website}`);
      if (instagram) noteParts.push(`IG: ${instagram}`);
      if (notesRaw) noteParts.push(`Notes: ${notesRaw}`);
      if (isSent) noteParts.push('[Sent via Master Lead Sheet]');

      return {
        name,
        email,
        phone,
        address: city || null,
        notes: noteParts.join(' | ') || null,
        type: 'Lead',
        status: isSent ? 'Active' : 'Pending',
      };
    })
    .filter((l): l is SeedLead => l !== null);
}
