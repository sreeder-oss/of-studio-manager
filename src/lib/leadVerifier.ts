import type { SeedLead } from '@/data/seedLeads';
import { enrichContactWithAI } from '@/lib/gmail';
import {
  extractVerifiedEmailsFromText,
  isJunkBusinessEmail,
  normalizeLeadName,
  normalizeLeadPhone,
  type SyncableContact,
} from '@/lib/leadSync';

export interface RawLeadCandidate {
  name: string;
  email: string | null;
  rejectedEmail: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  instagram: string | null;
  notes: string | null;
}

export type VerificationStatus =
  | 'verified_website'
  | 'mx_valid'
  | 'no_email'
  | 'error';

export type SyncActionKind = 'new' | 'update' | 'duplicate';

export interface VerifiedLeadResult {
  id: string;
  candidate: RawLeadCandidate;
  name: string;
  email: string | null;
  rejectedEmail: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  instagram: string | null;
  notes: string | null;
  verificationStatus: VerificationStatus;
  credibilityLabel: string;
  mxHost: string | null;
  syncAction: SyncActionKind;
  existingContactId: string | null;
  errorMessage?: string;
}

const EMAIL_FIND_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}/g;
const URL_FIND_RE = /\bhttps?:\/\/[^\s|,)<>"]+|\b(?:www\.)?[a-z0-9][a-z0-9-]*\.(?:com|org|net|co|io|build|design|studio|us|biz|info)(?:\/[^\s|,)<>"]*)?/gi;
const PHONE_FIND_RE = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/;
const IG_URL_RE = /https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)/i;
const IG_HANDLE_RE = /(?:^|[\s(,|])@([a-zA-Z0-9._]{2,30})\b/;

const mxCache = new Map<string, { hasMx: boolean; mxHost: string | null; checked: boolean }>();

/**
 * Live DNS MX check using Google DNS-over-HTTPS (works in browser & tests with zero API keys).
 */
export async function checkDomainMx(
  email: string | null | undefined,
): Promise<{ hasMx: boolean; mxHost: string | null; checked: boolean }> {
  if (!email || isJunkBusinessEmail(email)) {
    return { hasMx: false, mxHost: null, checked: true };
  }
  const domain = email.trim().toLowerCase().split('@')[1];
  if (!domain) return { hasMx: false, mxHost: null, checked: true };

  const cached = mxCache.get(domain);
  if (cached) return cached;

  try {
    const resp = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`,
      { headers: { Accept: 'application/dns-json' } },
    );
    if (!resp.ok) {
      return { hasMx: true, mxHost: null, checked: false };
    }
    const data = (await resp.json()) as {
      Status?: number;
      Answer?: Array<{ type?: number; data?: string }>;
    };
    const mxAnswers = (data.Answer || []).filter((a) => a.type === 15 && typeof a.data === 'string');
    if (mxAnswers.length > 0) {
      const host = mxAnswers[0].data!.split(/\s+/).pop()?.replace(/\.$/, '') || null;
      const res = { hasMx: true, mxHost: host, checked: true };
      mxCache.set(domain, res);
      return res;
    }
    // Status 3 = NXDOMAIN (domain doesn't exist); Status 0 with no MX = no mail server
    const res = { hasMx: false, mxHost: null, checked: true };
    mxCache.set(domain, res);
    return res;
  } catch {
    return { hasMx: true, mxHost: null, checked: false };
  }
}

export function clearMxCacheForTests(): void {
  mxCache.clear();
}

function cleanCompanyName(raw: string): string {
  return raw
    .replace(/^\s*(?:[-*•]+|\d+[.)])\s*/, '')
    .replace(/\*\*/g, '')
    .replace(/^\s*(?:company|firm|business|builder|designer|architect|name)\s*:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isIgnorableLine(line: string): boolean {
  const t = line.trim();
  if (!t) return true;
  if (/^[-|:=_\s]+$/.test(t)) return true; // markdown table separator
  if (/^#+\s/.test(t)) return true; // markdown heading
  if (/^\|?\s*(company|firm|business|name)(\s*\/\s*\w+)?\s*[|,\t]/i.test(t)) return true; // table/CSV header row
  return false;
}

function extractUrl(text: string): string | null {
  const matches = text.match(URL_FIND_RE) || [];
  for (const raw of matches) {
    const cleaned = raw.replace(/[.,;]+$/, '');
    // Skip emails accidentally matched as domains
    const idx = text.indexOf(raw);
    if (idx > 0 && text[idx - 1] === '@') continue;
    if (/instagram\.com|facebook\.com|linkedin\.com|twitter\.com|x\.com|youtube\.com|houzz\.com/i.test(cleaned)) {
      continue;
    }
    return /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
  }
  return null;
}

function extractInstagram(text: string): string | null {
  const urlMatch = text.match(IG_URL_RE);
  if (urlMatch && !/^(p|reel|stories|explore|accounts|share)$/i.test(urlMatch[1])) {
    return `@${urlMatch[1].replace(/\/$/, '')}`;
  }
  const handleMatch = text.match(IG_HANDLE_RE);
  if (handleMatch) {
    const h = handleMatch[1];
    if (!/\.(com|org|net|co|io|gov|edu)$/i.test(h)) {
      return `@${h}`;
    }
  }
  return null;
}

function parseSingleEntry(rawLine: string): RawLeadCandidate | null {
  if (isIgnorableLine(rawLine)) return null;

  // Extract structured tokens first
  const rawEmails = rawLine.match(EMAIL_FIND_RE) || [];
  const validEmails = extractVerifiedEmailsFromText(rawLine);
  const rejectedEmail = rawEmails.find((e) => isJunkBusinessEmail(e)) || null;
  const email = validEmails[0] || null;
  const phoneMatch = rawLine.match(PHONE_FIND_RE);
  const phone = phoneMatch ? phoneMatch[0].trim() : null;
  const website = extractUrl(rawLine);
  const instagram = extractInstagram(rawLine);

  // Split by common separators to pull company name + optional city/notes
  const normalizedLine = rawLine
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '');
  const parts = normalizedLine
    .split(/\s*(?:\||\t|\s+—\s+|\s+–\s+|\s+-\s+)\s*/)
    .map((p) => p.trim())
    .filter(Boolean);

  let namePart = parts[0] || normalizedLine;
  let extraParts = parts.slice(1);

  // If no pipe/dash delimiter, try comma-separated ("Snyder Construction Group, Springfield MO")
  if (parts.length === 1 && normalizedLine.includes(',')) {
    const commaParts = normalizedLine.split(',').map((p) => p.trim()).filter(Boolean);
    // Keep "Name, LLC" or "Name, Inc." together
    if (commaParts.length >= 2 && /^(llc|inc\.?|corp\.?|co\.?|ltd\.?)$/i.test(commaParts[1])) {
      namePart = `${commaParts[0]} ${commaParts[1]}`;
      extraParts = commaParts.slice(2);
    } else {
      namePart = commaParts[0];
      extraParts = commaParts.slice(1);
    }
  }

  // Strip email, URL, phone, IG out of namePart if user pasted everything inline
  let cleanedName = namePart
    .replace(EMAIL_FIND_RE, '')
    .replace(URL_FIND_RE, '')
    .replace(PHONE_FIND_RE, '')
    .replace(IG_URL_RE, '')
    .replace(/\(\s*\)/g, '')
    .trim();
  cleanedName = cleanCompanyName(cleanedName).replace(/[,;:\-–—]+$/, '').trim();

  if (!cleanedName || cleanedName.length < 2) return null;

  // Detect a likely city/location part from extraParts
  let address: string | null = null;
  const remainingNotes: string[] = [];
  for (const part of extraParts) {
    const withoutTokens = part
      .replace(EMAIL_FIND_RE, '')
      .replace(URL_FIND_RE, '')
      .replace(PHONE_FIND_RE, '')
      .replace(IG_URL_RE, '')
      .replace(IG_HANDLE_RE, '')
      .replace(/^(?:website|email|phone|ig|instagram|city|location|address|notes?)\s*:\s*/i, '')
      .trim();
    if (!withoutTokens) continue;
    if (
      !address &&
      withoutTokens.length <= 45 &&
      (/(?:,\s*[A-Z]{2}\b|\b(?:OKC|Oklahoma City|Tulsa|Edmond|Norman|Dallas|Austin|Fort Worth|Wichita|Kansas City|KC|Springfield|Bentonville|Fayetteville|Little Rock|OK|TX|AR|KS|MO)\b)/i.test(
        withoutTokens,
      ))
    ) {
      address = withoutTokens;
    } else {
      remainingNotes.push(withoutTokens);
    }
  }

  return {
    name: cleanedName,
    email,
    rejectedEmail,
    phone,
    address,
    website,
    instagram,
    notes: remainingNotes.length > 0 ? remainingNotes.join(' | ') : null,
  };
}

/**
 * Parses pasted raw leads from Gemini, Google Docs, notes, or bulleted lists
 * into deduplicated RawLeadCandidate entries ready for live verification.
 */
export function parseRawLeadText(text: string): RawLeadCandidate[] {
  if (!text || !text.trim()) return [];
  const rawLines = text.split(/\r?\n/);

  // Collapse multi-line labeled blocks ("Company: Foo\nWebsite: foo.com\nCity: Tulsa") into single entries
  const grouped: string[] = [];
  const isFieldContinuation = (line: string) =>
    /^\s*(?:[-*•]\s*)?(?:website|site|url|email|e-mail|phone|tel|city|location|address|ig|instagram|notes?|category|contact)\s*:/i.test(
      line,
    );

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (grouped.length > 0 && isFieldContinuation(trimmed)) {
      grouped[grouped.length - 1] = `${grouped[grouped.length - 1]} | ${trimmed}`;
    } else {
      grouped.push(trimmed);
    }
  }

  const seen = new Set<string>();
  const results: RawLeadCandidate[] = [];
  for (const line of grouped) {
    const parsed = parseSingleEntry(line);
    if (!parsed) continue;
    const key = normalizeLeadName(parsed.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    results.push(parsed);
  }
  return results;
}

function findMatchingContact(
  existingContacts: SyncableContact[],
  name: string,
  phone: string | null,
): SyncableContact | null {
  const isBranch = /—/.test(name);
  const nameKey = normalizeLeadName(name);
  const phoneKey = normalizeLeadPhone(phone);

  for (const c of existingContacts) {
    if (normalizeLeadName(c.name) === nameKey) return c;
  }
  if (!isBranch && phoneKey) {
    for (const c of existingContacts) {
      if (normalizeLeadPhone(c.phone) === phoneKey) return c;
    }
  }
  return null;
}

/**
 * Runs live web + /contact verification + DNS MX check for a single candidate
 * and computes whether it's a new lead, updates an existing lead, or is already synced.
 */
export async function verifySingleLead(
  candidate: RawLeadCandidate,
  existingContacts: SyncableContact[],
): Promise<VerifiedLeadResult> {
  const id = `${normalizeLeadName(candidate.name)}-${Math.random().toString(36).slice(2, 7)}`;
  const seedNotesParts = [
    candidate.website ? `Website: ${candidate.website}` : null,
    candidate.instagram ? `IG: ${candidate.instagram}` : null,
    candidate.notes,
  ].filter(Boolean);

  let foundEmail: string | null = null;
  let foundPhone: string | null = null;
  let foundAddress: string | null = null;
  let foundWebsite: string | null = null;
  let foundInstagram: string | null = null;
  let foundContactPerson: string | null = null;
  let lookupError: string | undefined;

  try {
    const enriched = await enrichContactWithAI({
      name: candidate.name,
      address: candidate.address,
      email: candidate.email,
      phone: candidate.phone,
      notes: seedNotesParts.join(' | ') || null,
    });
    foundEmail = enriched.email && !isJunkBusinessEmail(enriched.email) ? enriched.email : null;
    foundPhone = enriched.phone || null;
    foundAddress = enriched.address || null;
    foundWebsite = enriched.website || null;
    foundInstagram = enriched.instagram || null;
    foundContactPerson = enriched.contact_person || null;
  } catch (err: unknown) {
    lookupError = err instanceof Error ? err.message : 'Live lookup failed';
  }

  let finalEmail: string | null = null;
  let rejectedEmail = candidate.rejectedEmail;
  let verificationStatus: VerificationStatus = 'no_email';
  let credibilityLabel = 'No Public Email (Web Form / IG Only)';
  let mxHost: string | null = null;

  // Prefer live website-found email first, then pasted candidate email
  if (foundEmail) {
    const mx = await checkDomainMx(foundEmail);
    if (mx.hasMx) {
      finalEmail = foundEmail;
      mxHost = mx.mxHost;
      verificationStatus = 'verified_website';
      credibilityLabel = mx.checked ? 'Verified (On Website + MX Active)' : 'Verified (On Website)';
    } else {
      rejectedEmail = rejectedEmail || foundEmail;
    }
  }

  if (!finalEmail && candidate.email && !isJunkBusinessEmail(candidate.email)) {
    const mx = await checkDomainMx(candidate.email);
    if (mx.hasMx) {
      finalEmail = candidate.email;
      mxHost = mx.mxHost;
      verificationStatus = 'mx_valid';
      credibilityLabel = mx.checked
        ? 'MX Valid (Active Domain — Not Shown on Site)'
        : 'Unverified Email (DNS Offline)';
    } else {
      rejectedEmail = rejectedEmail || candidate.email;
      credibilityLabel = 'Rejected Email (No Active Mail Server)';
    }
  }

  if (!finalEmail && lookupError && !candidate.email) {
    verificationStatus = 'error';
    credibilityLabel = lookupError;
  }

  const finalPhone = candidate.phone || foundPhone;
  const finalAddress =
    foundAddress && (!candidate.address || foundAddress.length > candidate.address.length + 5)
      ? foundAddress
      : candidate.address || foundAddress;
  const finalWebsite = candidate.website || foundWebsite;
  const finalInstagram = candidate.instagram || foundInstagram;

  const noteParts: string[] = [];
  noteParts.push(`Email Status: ${credibilityLabel}`);
  if (foundContactPerson) noteParts.push(`Contact: ${foundContactPerson}`);
  if (finalWebsite) noteParts.push(`Website: ${finalWebsite}`);
  if (finalInstagram) noteParts.push(`IG: ${finalInstagram}`);
  if (rejectedEmail) noteParts.push(`Blocked Bogus Email: ${rejectedEmail}`);
  if (candidate.notes) noteParts.push(`Notes: ${candidate.notes}`);

  const matched = findMatchingContact(existingContacts, candidate.name, finalPhone);
  let syncAction: SyncActionKind = 'new';
  if (matched) {
    const existingEmailBad = !matched.email || isJunkBusinessEmail(matched.email);
    const improvesEmail = existingEmailBad && Boolean(finalEmail);
    const improvesPhone = !matched.phone && Boolean(finalPhone);
    const improvesAddress =
      Boolean(finalAddress) && (!matched.address || finalAddress!.length > matched.address.length + 5);
    const existingNotesLower = (matched.notes || '').toLowerCase();
    const improvesIg = Boolean(finalInstagram && !existingNotesLower.includes(finalInstagram.toLowerCase()));
    const improvesSite = Boolean(
      finalWebsite &&
        !existingNotesLower.includes(finalWebsite.replace(/^https?:\/\//i, '').replace(/\/$/, '').toLowerCase()),
    );
    syncAction =
      improvesEmail || improvesPhone || improvesAddress || improvesIg || improvesSite
        ? 'update'
        : 'duplicate';
  }

  return {
    id,
    candidate,
    name: candidate.name,
    email: finalEmail,
    rejectedEmail,
    phone: finalPhone,
    address: finalAddress,
    website: finalWebsite,
    instagram: finalInstagram,
    notes: noteParts.join(' | '),
    verificationStatus,
    credibilityLabel,
    mxHost,
    syncAction,
    existingContactId: matched?.id ?? null,
    errorMessage: lookupError,
  };
}

export function verifiedResultToSeedLead(r: VerifiedLeadResult): SeedLead {
  return {
    name: r.name,
    email: r.email,
    phone: r.phone,
    address: r.address,
    notes: r.notes,
    type: 'Lead',
    status: 'Pending',
  };
}

function csvEscape(val: string | null | undefined): string {
  const s = String(val ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Exports Leads to a clean CSV matching the Master Verified Outreach Leads format
 * so Shawn can save an optional Drive backup anytime.
 */
export function buildVerifiedLeadsCsv(contacts: SyncableContact[]): string {
  const headers = ['Company', 'Verified Email', 'Phone', 'City / Address', 'Status', 'Notes'];
  const rows = contacts.map((c) =>
    [c.name, c.email, c.phone, c.address, c.status, c.notes].map(csvEscape).join(','),
  );
  return [headers.join(','), ...rows].join('\n');
}
