import { supabase } from '@/integrations/supabase/client';
import {
  BACKUP_AI_MODEL_ID,
  DEFAULT_AI_MODEL_ID,
  getStoredBackupKey,
  getStoredDeepSeekKey,
  getStoredModelId,
} from '@/lib/aiModels';
import { extractVerifiedEmailsFromText, isJunkBusinessEmail } from '@/lib/leadSync';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_URL_BODY_CHARS = 1050;

function trimBodyForUrl(body: string): { text: string; truncated: boolean } {
  if (body.length <= MAX_URL_BODY_CHARS) {
    return { text: body, truncated: false };
  }
  return {
    text: `${body.slice(0, MAX_URL_BODY_CHARS - 60).trimEnd()}\n\n[Full message copied to clipboard — press Ctrl+V / Paste]`,
    truncated: true,
  };
}

export type MailPlatform = 'android' | 'ios' | 'desktop';

export function detectMailPlatform(userAgent?: string): MailPlatform {
  const ua =
    userAgent ??
    (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (
    userAgent === undefined &&
    typeof navigator !== 'undefined' &&
    /Macintosh/i.test(ua) &&
    navigator.maxTouchPoints > 1
  ) {
    return 'ios';
  }
  return 'desktop';
}

function formatMailtoRecipients(to: string): string {
  const trimmed = to.trim();
  if (!trimmed) return '';
  return trimmed
    .split(',')
    .map((addr) => encodeURIComponent(addr.trim()).replace(/%40/gi, '@'))
    .filter(Boolean)
    .join(',');
}

function buildMailtoPath(to: string, subject: string, body: string): string {
  const { text } = trimBodyForUrl(body);
  const parts: string[] = [];
  if (subject.trim()) parts.push(`subject=${encodeURIComponent(subject.trim())}`);
  if (text.trim()) parts.push(`body=${encodeURIComponent(text)}`);
  const recipient = formatMailtoRecipients(to);
  return `${recipient}${parts.length ? `?${parts.join('&')}` : ''}`;
}

export function buildGmailWebComposeUrl(to: string, subject: string, body: string): string {
  const { text } = trimBodyForUrl(body);
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    tf: 'cm',
  });
  const recipient = formatMailtoRecipients(to);
  if (recipient) params.set('to', recipient);
  if (subject.trim()) params.set('su', subject.trim());
  if (text.trim()) params.set('body', text);
  return `https://mail.google.com/mail/?${params.toString()}`;
}

/**
 * Builds an Android Chrome Intent URI that targets the native Gmail app
 * (`com.google.android.gm`) with a `mailto:` payload so To, Subject, and Body
 * are pre-filled (desktop `mail.google.com/?tf=cm` links drop compose params
 * when intercepted on mobile). Falls back to Gmail web compose if Gmail is not installed.
 */
export function buildAndroidGmailIntentUrl(to: string, subject: string, body: string): string {
  const mailtoPath = buildMailtoPath(to, subject, body);
  const webFallback = buildGmailWebComposeUrl(to, subject, body);
  return (
    `intent:${mailtoPath || '?'}#Intent;` +
    `scheme=mailto;` +
    `package=com.google.android.gm;` +
    `S.browser_fallback_url=${encodeURIComponent(webFallback)};` +
    `end`
  );
}

/**
 * Builds an iOS Gmail app deep link (`googlegmail:///co?...`) with pre-filled
 * To, Subject, and Body.
 */
export function buildIosGmailComposeUrl(to: string, subject: string, body: string): string {
  const { text } = trimBodyForUrl(body);
  const parts: string[] = [];
  if (to.trim()) parts.push(`to=${encodeURIComponent(to.trim())}`);
  if (subject.trim()) parts.push(`subject=${encodeURIComponent(subject.trim())}`);
  if (text.trim()) parts.push(`body=${encodeURIComponent(text)}`);
  return `googlegmail:///co${parts.length ? `?${parts.join('&')}` : ''}`;
}

export function buildGmailComposeUrl(
  to: string,
  subject: string,
  body: string,
  userAgent?: string,
): string {
  const platform = detectMailPlatform(userAgent);
  if (platform === 'android') {
    return buildAndroidGmailIntentUrl(to, subject, body);
  }
  if (platform === 'ios') {
    return buildIosGmailComposeUrl(to, subject, body);
  }
  return buildGmailWebComposeUrl(to, subject, body);
}

export function getGmailLinkTarget(userAgent?: string): '_top' | '_blank' {
  return detectMailPlatform(userAgent) === 'desktop' ? '_blank' : '_top';
}

export function buildMailtoUrl(to: string, subject: string, body: string): string {
  return `mailto:${buildMailtoPath(to, subject, body)}`;
}

export function isBodyTruncatedForUrl(body: string): boolean {
  return body.length > MAX_URL_BODY_CHARS;
}

/**
 * Opens Gmail compose using a real anchor click: native Gmail app intent/scheme
 * on Android & iOS (with `_top` target) and Gmail web compose in a new tab on
 * desktop (with `_blank`). Returns true if the body was truncated.
 */
export function openGmailCompose(to: string, subject: string, body: string): boolean {
  const truncated = isBodyTruncatedForUrl(body);
  if (truncated && typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(body).catch(() => {});
  }
  const target = getGmailLinkTarget();
  const a = document.createElement('a');
  a.href = buildGmailComposeUrl(to, subject, body);
  a.target = target;
  if (target === '_blank') {
    a.rel = 'noopener noreferrer';
  }
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return truncated;
}

/**
 * Opens the device's default mail app (phone / desktop) via an anchor element
 * instead of mutating window.location.href (which can 404 inside iframes).
 */
export function openMailto(to: string, subject: string, body: string): boolean {
  const truncated = isBodyTruncatedForUrl(body);
  if (truncated && typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(body).catch(() => {});
  }
  const a = document.createElement('a');
  a.href = buildMailtoUrl(to, subject, body);
  a.target = '_top';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return truncated;
}

export interface OutreachSentInfo {
  sent: boolean;
  lastSentDate: string | null;
  count: number;
}

/**
 * Parses contact notes to determine whether outreach email(s) have been sent.
 */
export function getOutreachSentInfo(notes?: string | null): OutreachSentInfo {
  if (!notes) return { sent: false, lastSentDate: null, count: 0 };
  const matches = [...notes.matchAll(/\[(?:AI )?Outreach: Emailed [^\]]*? on ([^\]]+)\]/gi)];
  if (matches.length > 0) {
    const lastDate = matches[matches.length - 1][1]?.trim() || null;
    return { sent: true, lastSentDate: lastDate, count: matches.length };
  }
  if (/\[Sent\b/i.test(notes)) {
    return { sent: true, lastSentDate: null, count: 1 };
  }
  return { sent: false, lastSentDate: null, count: 0 };
}

export interface ContactEnrichmentResult {
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  instagram: string | null;
  contact_person: string | null;
  notes_summary: string | null;
}

function isAbortError(err: unknown, signal?: AbortSignal): boolean {
  if (signal?.aborted) return true;
  return typeof err === 'object' && err !== null && (err as { name?: string }).name === 'AbortError';
}

async function enrichViaWebTools(
  params: {
    name: string;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
    notes?: string | null;
  },
  authHeader: string,
  signal?: AbortSignal,
): Promise<ContactEnrichmentResult> {
  const webToolsUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/web-tools`;
  const postWebTools = async (payload: Record<string, unknown>) => {
    const r = await fetch(webToolsUrl, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    });
    if (!r.ok) return null;
    return r.json().catch(() => null);
  };

  const notes = params.notes || '';
  const notesSiteMatch = notes.match(/(?:Website:\s*|https?:\/\/)([a-z0-9.-]+\.[a-z]{2,})/i);
  const query = `"${params.name}" ${params.address || ''} contact email`;
  const igQuery = `"${params.name}" ${params.address || ''} site:instagram.com`;

  const [searchData, igData] = await Promise.all([
    postWebTools({ op: 'search', query, limit: 6 }),
    postWebTools({ op: 'search', query: igQuery, limit: 3 }),
  ]);

  const searchResults: Array<{ url?: string; title?: string; description?: string }> =
    Array.isArray(searchData?.results) ? searchData.results : [];
  const igResults: Array<{ url?: string; title?: string; description?: string }> =
    Array.isArray(igData?.results) ? igData.results : [];

  const companyUrl =
    (notesSiteMatch ? `https://${notesSiteMatch[1]}` : null) ||
    searchResults.find(
      (r) =>
        typeof r.url === 'string' &&
        !/instagram\.com|facebook\.com|linkedin\.com|yelp\.com|houzz\.com|thumbtack\.com|mapquest\.com|bbb\.org/i.test(
          r.url,
        ),
    )?.url ||
    null;

  let combinedText = [
    ...searchResults.map((r) => `${r.title || ''} ${r.description || ''} ${r.url || ''}`),
    ...igResults.map((r) => `${r.title || ''} ${r.description || ''} ${r.url || ''}`),
  ].join('\n');

  if (companyUrl) {
    try {
      const origin = new URL(companyUrl).origin;
      const targets = Array.from(new Set([companyUrl, `${origin}/contact`, `${origin}/contact-us`])).slice(0, 3);
      const scraped = await Promise.all(targets.map((url) => postWebTools({ op: 'scrape', url })));
      for (const page of scraped) {
        if (page?.markdown) combinedText += `\n${page.markdown}`;
        if (Array.isArray(page?.links)) combinedText += `\n${page.links.join('\n')}`;
      }
    } catch (e: unknown) {
      if (isAbortError(e, signal)) throw e;
      /* ignore malformed URL */
    }
  }

  const emails = extractVerifiedEmailsFromText(combinedText, companyUrl);
  const phoneMatch = combinedText.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/);
  const igMatch = combinedText.match(/https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)/i);
  const igHandle =
    igMatch && !/^(p|reel|stories|explore|accounts|share)$/i.test(igMatch[1])
      ? `@${igMatch[1].replace(/\/$/, '')}`
      : null;

  return {
    email: emails[0] || null,
    phone: phoneMatch ? phoneMatch[0].trim() : null,
    address: null,
    website: companyUrl,
    instagram: igHandle,
    contact_person: null,
    notes_summary: emails[0] ? `Verified via live website lookup` : null,
  };
}

/**
 * Cross-references a lead across the web & Instagram via ai-chat (enrich_contact mode),
 * with automatic fallback to web-tools (search + /contact scrape) if the deployed ai-chat
 * edge function is unavailable or older (e.g. returns 400 "messages required").
 */
export async function enrichContactWithAI(
  params: {
    name: string;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
    notes?: string | null;
  },
  signal?: AbortSignal,
): Promise<ContactEnrichmentResult> {
  const chatUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
  const { data: { session } } = await supabase.auth.getSession();
  const authHeader = `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`;

  let primaryErr = '';
  try {
    const resp = await fetch(chatUrl, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        mode: 'enrich_contact',
        contact: params,
        model: getStoredModelId(),
        apiKey: getStoredDeepSeekKey() || undefined,
        backupApiKey: getStoredBackupKey() || undefined,
      }),
    });

    if (resp.ok) {
      const result = (await resp.json()) as ContactEnrichmentResult;
      if (result.email && isJunkBusinessEmail(result.email)) {
        result.email = null;
      }
      return result;
    }

    if (resp.status === 401 || resp.status === 403) {
      throw new Error('Sign in required to run contact lookup.');
    }

    try {
      const json = await resp.json();
      primaryErr = json?.error || `Contact lookup failed (${resp.status})`;
    } catch {
      primaryErr = `Contact lookup failed (${resp.status})`;
    }
  } catch (e: unknown) {
    if (isAbortError(e, signal)) throw e;
    if (e instanceof Error && /Sign in required/i.test(e.message)) throw e;
    primaryErr = e instanceof Error ? e.message : 'Could not reach AI contact lookup';
  }

  // Fallback to live web-tools search + /contact page scrape (works even if ai-chat hasn't redeployed enrich_contact yet)
  try {
    const fallbackResult = await enrichViaWebTools(params, authHeader, signal);
    return fallbackResult;
  } catch (e: unknown) {
    if (isAbortError(e, signal)) throw e;
    throw new Error(primaryErr || 'Contact lookup failed — please try again.');
  }
}

function parseDraftText(raw: string, fallbackSubject: string): { subject: string; body: string } {
  const cleaned = raw.trim();
  const subjectMatch = cleaned.match(/^SUBJECT:\s*(.+)$/im);
  const subject = subjectMatch ? subjectMatch[1].trim() : fallbackSubject;
  let body = cleaned;
  if (subjectMatch) {
    const sepIdx = cleaned.indexOf('---');
    if (sepIdx !== -1) {
      body = cleaned.slice(sepIdx + 3).trim();
    } else {
      body = cleaned.replace(/^SUBJECT:.*\n?/im, '').trim();
    }
  }
  return { subject, body };
}

async function readSSEStream(resp: Response): Promise<string> {
  if (!resp.body) return '';
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buffer.indexOf('\n')) !== -1) {
      let line = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (!line.startsWith('data: ')) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === '[DONE]') break;
      try {
        const parsed = JSON.parse(jsonStr);
        const delta = parsed?.choices?.[0]?.delta?.content;
        if (typeof delta === 'string') fullText += delta;
      } catch {
        /* ignore partial chunks */
      }
    }
  }
  return fullText.trim();
}

async function draftDirectlyViaOpenRouter(
  prompt: string,
  preferredModel: string,
  primaryKey: string,
  backupKey: string,
): Promise<string> {
  const wantsGemma = preferredModel.toLowerCase().includes('gemma');
  const primaryOrKey = primaryKey.startsWith('sk-or-') ? primaryKey : '';
  const backupOrKey = backupKey.startsWith('sk-or-') ? backupKey : '';

  const attempts: Array<{ model: string; key: string }> = wantsGemma
    ? [
        ...(backupOrKey || primaryOrKey ? [{ model: BACKUP_AI_MODEL_ID, key: backupOrKey || primaryOrKey }] : []),
        ...(primaryOrKey || backupOrKey ? [{ model: DEFAULT_AI_MODEL_ID, key: primaryOrKey || backupOrKey }] : []),
      ]
    : [
        ...(primaryOrKey || backupOrKey ? [{ model: DEFAULT_AI_MODEL_ID, key: primaryOrKey || backupOrKey }] : []),
        ...(backupOrKey || primaryOrKey ? [{ model: BACKUP_AI_MODEL_ID, key: backupOrKey || primaryOrKey }] : []),
      ];

  let lastErr = 'No OpenRouter API key saved in Settings';
  for (const attempt of attempts) {
    try {
      const resp = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${attempt.key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'OF Studio Manager',
        },
        body: JSON.stringify({
          model: attempt.model,
          temperature: 0.4,
          stream: false,
          messages: [
            {
              role: 'system',
              content:
                'You write concise, commercial-grade outreach emails for Shawn Reeder, owner of Organic Finishes LLC (specialty plaster & microcement). Follow the requested output format exactly.',
            },
            { role: 'user', content: prompt },
          ],
        }),
      });
      if (!resp.ok) {
        lastErr = `OpenRouter ${attempt.model} returned HTTP ${resp.status}`;
        continue;
      }
      const data = await resp.json();
      const text = String(data?.choices?.[0]?.message?.content ?? '').trim();
      if (text) return text;
      lastErr = `OpenRouter ${attempt.model} returned an empty draft`;
    } catch (e: any) {
      lastErr = e?.message || 'OpenRouter request failed';
    }
  }
  throw new Error(lastErr);
}

/**
 * Calls the onboard AI (ai-chat edge function, with automatic direct OpenRouter
 * fallback if the edge function is unavailable and an OpenRouter key is saved
 * in Settings) to draft a tailored outreach email.
 */
export async function generateOutreachDraftWithAI(params: {
  contactName: string;
  contactEmail?: string | null;
  contactAddress?: string | null;
  contactNotes?: string | null;
  topicTitle: string;
  topicSummary: string;
  customInstruction?: string;
  includeGuideLink: boolean;
  guideUrl: string;
}): Promise<{ subject: string; body: string }> {
  const chatUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
  const { data: { session } } = await supabase.auth.getSession();

  const prompt = [
    `Draft a concise, commercial-grade outreach email from Shawn Reeder (Owner & Principal Applicator, Organic Finishes LLC — 405-816-0750, contact@organicfinishesllc.org, https://organicfinishesllc.org, Instagram: https://instagram.com/organic.finishes; serving OK, TX, AR, KS, MO).`,
    `Recipient: ${params.contactName}${params.contactAddress ? ` (${params.contactAddress})` : ''}`,
    params.contactNotes ? `Known context/notes: ${params.contactNotes}` : '',
    `Topic: ${params.topicTitle} — ${params.topicSummary}`,
    params.customInstruction?.trim() ? `Specific instructions from Shawn: ${params.customInstruction.trim()}` : '',
    params.includeGuideLink ? `Include this direct PDF spec guide link cleanly in the body: ${params.guideUrl}` : '',
    `Rules: Keep it direct, craftsman-level, no fluff or cheesy sales hype, 2-4 short paragraphs max. Do NOT output any JSON action blocks.`,
    `Format your response EXACTLY as:`,
    `SUBJECT: <one-line subject>`,
    `---`,
    `<email body>`,
  ].filter(Boolean).join('\n');

  const model = getStoredModelId();
  const apiKey = getStoredDeepSeekKey();
  const backupApiKey = getStoredBackupKey();
  const fallbackSubject = `${params.topicTitle} — Organic Finishes LLC`;

  let edgeErr = '';
  try {
    const resp = await fetch(chatUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        mode: 'outreach_draft',
        prompt,
        messages: [{ role: 'user', content: prompt }],
        currentPage: '/contacts',
        model,
        apiKey: apiKey || undefined,
        backupApiKey: backupApiKey || undefined,
      }),
    });

    if (resp.ok) {
      const ct = resp.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const data = await resp.json();
        const text = String(data?.text ?? '').trim();
        if (text) return parseDraftText(text, fallbackSubject);
      } else {
        const text = await readSSEStream(resp);
        if (text && !/^_.*error.*_$/i.test(text)) {
          return parseDraftText(text, fallbackSubject);
        }
      }
      edgeErr = 'AI returned an empty draft';
    } else {
      try {
        const json = await resp.json();
        edgeErr = json?.error || `AI service error (${resp.status})`;
      } catch {
        edgeErr = `AI service error (${resp.status})`;
      }
    }
  } catch (e: any) {
    edgeErr = e?.message || 'Could not reach AI service';
  }

  // Fallback directly to OpenRouter from browser if user has an OpenRouter key saved in Settings
  if (apiKey.startsWith('sk-or-') || backupApiKey.startsWith('sk-or-')) {
    const directText = await draftDirectlyViaOpenRouter(prompt, model, apiKey, backupApiKey);
    return parseDraftText(directText, fallbackSubject);
  }

  throw new Error(edgeErr || 'AI drafting failed — paste your OpenRouter key in Settings and try again.');
}
