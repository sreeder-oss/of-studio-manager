import { supabase } from '@/integrations/supabase/client';
import { getStoredDeepSeekKey, getStoredBackupKey, getStoredModelId } from '@/lib/aiModels';

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

/**
 * Calls the onboard AI (ai-chat edge function / DeepSeek V4.1 Flash or Gemma 4 31B backup)
 * to draft a tailored outreach email without polluting the main chat history.
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

  const resp = await fetch(chatUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      currentPage: '/contacts',
      model: getStoredModelId(),
      apiKey: getStoredDeepSeekKey() || undefined,
      backupApiKey: getStoredBackupKey() || undefined,
    }),
  });

  if (!resp.ok) {
    let errMsg = 'AI drafting failed';
    try {
      const json = await resp.json();
      if (json?.error) errMsg = json.error;
    } catch {
      /* ignore */
    }
    throw new Error(errMsg);
  }

  if (!resp.body) {
    throw new Error('No response from AI');
  }

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

  const cleaned = fullText.trim();
  if (!cleaned) {
    throw new Error('AI returned an empty draft');
  }

  // Parse SUBJECT: ... \n---\n <body>
  const subjectMatch = cleaned.match(/^SUBJECT:\s*(.+)$/im);
  const subject = subjectMatch ? subjectMatch[1].trim() : `${params.topicTitle} — Organic Finishes LLC`;
  let body = cleaned;
  if (subjectMatch) {
    const sepIdx = cleaned.indexOf('---');
    if (sepIdx !== -1) {
      body = cleaned.slice(sepIdx + 3).trim();
    } else {
      body = cleaned.replace(/^SUBJECT:.*$/im, '').trim();
    }
  }

  return { subject, body };
}
