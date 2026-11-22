import { supabase } from '@/integrations/supabase/client';
import {
  BACKUP_AI_MODEL_ID,
  DEFAULT_AI_MODEL_ID,
  getStoredBackupKey,
  getStoredDeepSeekKey,
  getStoredModelId,
} from '@/lib/aiModels';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export function buildGmailComposeUrl(to: string, subject: string, body: string): string {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function buildMailtoUrl(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function openGmailCompose(to: string, subject: string, body: string): void {
  window.open(buildGmailComposeUrl(to, subject, body), '_blank', 'noopener,noreferrer');
}

export function openMailto(to: string, subject: string, body: string): void {
  window.location.href = buildMailtoUrl(to, subject, body);
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
