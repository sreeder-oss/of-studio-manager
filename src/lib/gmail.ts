import { supabase } from '@/integrations/supabase/client';
import {
  BACKUP_AI_MODEL_ID,
  DEFAULT_AI_MODEL_ID,
  getStoredBackupKey,
  getStoredDeepSeekKey,
  getStoredModelId,
} from '@/lib/aiModels';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_URL_BODY_CHARS = 1400;

function trimBodyForUrl(body: string): { text: string; truncated: boolean } {
  if (body.length <= MAX_URL_BODY_CHARS) {
    return { text: body, truncated: false };
  }
  return {
    text: `${body.slice(0, MAX_URL_BODY_CHARS - 60).trimEnd()}\n\n[Full message copied to clipboard — press Ctrl+V / Paste]`,
    truncated: true,
  };
}

export function buildGmailComposeUrl(to: string, subject: string, body: string): string {
  const { text } = trimBodyForUrl(body);
  const params = new URLSearchParams();
  params.set('fs', '1');
  params.set('tf', 'cm');
  if (to.trim()) params.set('to', to.trim());
  if (subject.trim()) params.set('su', subject.trim());
  if (text.trim()) params.set('body', text);
  return `https://mail.google.com/mail/u/0/?${params.toString()}`;
}

export function buildMailtoUrl(to: string, subject: string, body: string): string {
  const { text } = trimBodyForUrl(body);
  const parts: string[] = [];
  if (subject.trim()) parts.push(`subject=${encodeURIComponent(subject.trim())}`);
  if (text.trim()) parts.push(`body=${encodeURIComponent(text)}`);
  const recipient = to.trim() ? encodeURIComponent(to.trim()) : '';
  return `mailto:${recipient}${parts.length ? `?${parts.join('&')}` : ''}`;
}

export function isBodyTruncatedForUrl(body: string): boolean {
  return body.length > MAX_URL_BODY_CHARS;
}

/**
 * Opens Gmail web compose in a new tab using a real anchor click (avoids iframe
 * navigation 404s and popup blockers). Returns true if the body was truncated.
 */
export function openGmailCompose(to: string, subject: string, body: string): boolean {
  const truncated = isBodyTruncatedForUrl(body);
  if (truncated && typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(body).catch(() => {});
  }
  const a = document.createElement('a');
  a.href = buildGmailComposeUrl(to, subject, body);
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
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

/**
 * Cross-references a lead across the web & Instagram via ai-chat (enrich_contact mode)
 * to find missing street address, email, phone, website, and Instagram handle.
 */
export async function enrichContactWithAI(params: {
  name: string;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}): Promise<ContactEnrichmentResult> {
  const chatUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
  const { data: { session } } = await supabase.auth.getSession();

  const resp = await fetch(chatUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({
      mode: 'enrich_contact',
      contact: params,
      model: getStoredModelId(),
      apiKey: getStoredDeepSeekKey() || undefined,
      backupApiKey: getStoredBackupKey() || undefined,
    }),
  });

  if (!resp.ok) {
    let errMsg = `Contact lookup failed (${resp.status})`;
    try {
      const json = await resp.json();
      if (json?.error) errMsg = json.error;
    } catch {
      /* ignore */
    }
    throw new Error(errMsg);
  }

  return (await resp.json()) as ContactEnrichmentResult;
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
    `Draft a concise, commercial-grade outreach email from Shawn Reeder (Owner & Principal Applicator, Organic Finishes LLC — 405-816-0750, contact@organicfinishesllc.org, organicfinishesllc.org; serving OK, TX, AR, KS, MO).`,
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
