import React, { useState, useEffect } from 'react';
import { Mail, Sparkles, Copy, ExternalLink, Check, FileText, Loader2, Smartphone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { DbContact } from '@/hooks/useContacts';
import { useSaveContact } from '@/hooks/useContacts';
import {
  buildGmailComposeUrl,
  buildMailtoUrl,
  generateOutreachDraftWithAI,
  getGmailLinkTarget,
  getOutreachSentInfo,
  isBodyTruncatedForUrl,
} from '@/lib/gmail';

interface OutreachEmailModalProps {
  contact: DbContact | null;
  isOpen: boolean;
  onClose: () => void;
}

export type OutreachTopic = 'microcement' | 'venetian' | 'commercial' | 'demofree';

interface TopicOption {
  id: OutreachTopic;
  title: string;
  description: string;
  defaultSubject: string;
  guideTitle: string;
  guideUrl: string;
}

const TOPICS: TopicOption[] = [
  {
    id: 'microcement',
    title: 'Microcement Rules & Wet Area Specs',
    description: 'Seamless waterproof wet rooms, zero grout lines, substrate prep & mesh reinforcement',
    defaultSubject: 'Architectural Microcement Systems & CSI Div 09 Specs — Organic Finishes',
    guideTitle: 'Microcement Design & Application Guide',
    guideUrl: 'https://docs.google.com/document/d/1cRkoRKcM_2lx3dGBEoDO0ZHEDY9w-CXzRuumHdkZAAM/preview',
  },
  {
    id: 'commercial',
    title: 'Commercial GC Intro (HEPA & Off-Hours)',
    description: 'Festool HEPA dust extraction, overnight/off-hours shifts, single-point owner accountability',
    defaultSubject: 'Commercial Specialty Finishes & Off-Hours Subcontracting — Organic Finishes',
    guideTitle: 'Commercial Capability Statement',
    guideUrl: 'https://docs.google.com/document/d/1wIhVKDqvqIsEClRNWJV1zYD1QB3t4Telk5EIL5cuPT0/preview',
  },
  {
    id: 'venetian',
    title: 'Venetian & Specialty Lime Plaster',
    description: 'Italian Marmorino, Tadelakt, integral color, luxury residential & boutique retail',
    defaultSubject: 'Artisan Venetian & Lime Plaster Finishes — Organic Finishes',
    guideTitle: 'Architectural Plaster & Microcement Overview',
    guideUrl: 'https://docs.google.com/document/d/1dTxfSjOSf91a5DMSP4q8v0-2j4QSWDx1QWa-osfoidc/preview',
  },
  {
    id: 'demofree',
    title: 'Demolition-Free Surface Renovations',
    description: 'Overlay sound tile, drywall & concrete without noisy demolition or landfill waste',
    defaultSubject: 'Demolition-Free Surface Transformations — Organic Finishes',
    guideTitle: 'The Death of Demolition: Microcement vs. Tile',
    guideUrl: 'https://docs.google.com/document/d/1ksad0frkXSkgqiuiMpUZMyw_2-nBRBgs-mwGuFjUPyo/preview',
  },
];

function buildInstantDraft(contact: DbContact, topicId: OutreachTopic, includeGuideLink: boolean) {
  const topic = TOPICS.find((t) => t.id === topicId) || TOPICS[0];
  const greeting = contact.name ? `Hi ${contact.name.split(' ')[0]},` : 'Hello,';
  const guideSection = includeGuideLink
    ? `\n\nView our ${topic.guideTitle} here:\n${topic.guideUrl}\n\nPortfolio & Systems: https://organicfinishesllc.org`
    : `\n\nPortfolio & Systems: https://organicfinishesllc.org`;

  let topicMessage = '';
  switch (topicId) {
    case 'microcement':
      topicMessage = `I'm reaching out from Organic Finishes LLC. We specialize in artisan microcement systems for seamless floors, feature walls, and waterproof showers/wet areas across Oklahoma, Texas, Arkansas, Kansas, and Missouri.\n\nOur system delivers a continuous, hand-troweled mineral finish with zero grout lines or maintenance callbacks. Every wet application includes commercial liquid waterproofing and embedded fiberglass mesh reinforcement.`;
      break;
    case 'commercial':
      topicMessage = `I wanted to briefly introduce Organic Finishes LLC for your upcoming CSI Division 09 interior finish and specialty coating bids.\n\nTwo key reasons commercial GCs partner with us:\n1. Festool HEPA Dust Extraction: Safe, fully dust-controlled prep for active retail, hospitality, or occupied office build-outs.\n2. Overnight & Off-Hours Execution: We mobilize night shifts to keep your turnover on schedule without interrupting business operations.\n\nI handle every project with single-point owner accountability. Fully insured and ready on PlanHub, BuildingConnected, and Procore.`;
      break;
    case 'venetian':
      topicMessage = `I'm reaching out from Organic Finishes LLC regarding specialty wall finishes for your architectural and design projects. We hand-craft authentic Venetian plasters, Marmorino, and Tadelakt lime plasters with custom integral color palettes.\n\nCustom project sample boards matching your exact palette are produced for your design approval prior to mobilization.`;
      break;
    case 'demofree':
      topicMessage = `I wanted to share a high-value alternative to traditional tile demolition for upcoming remodel scopes. Our microcement system bonds tenaciously over sound existing tile, concrete, and substrates, bypassing days of noisy demolition, dust containment, and debris disposal while delivering an ultra-modern seamless stone finish.`;
      break;
  }

  const signoff = `\n\nI'd welcome the opportunity to review any upcoming drawings or provide preliminary budget numbers for your team.\n\nBest regards,\nShawn Reeder — Owner & Principal Applicator\nOrganic Finishes LLC\nDirect: (405) 816-0750\nEmail: contact@organicfinishesllc.org\nWebsite: https://organicfinishesllc.org\nInstagram: https://instagram.com/organic.finishes`;

  return {
    subject: topic.defaultSubject,
    body: `${greeting}\n\n${topicMessage}${guideSection}${signoff}`,
  };
}

export const OutreachEmailModal: React.FC<OutreachEmailModalProps> = ({ contact, isOpen, onClose }) => {
  const [selectedTopic, setSelectedTopic] = useState<OutreachTopic>('microcement');
  const [includeGuideLink, setIncludeGuideLink] = useState(true);
  const [customInstruction, setCustomInstruction] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [copied, setCopied] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [draftSource, setDraftSource] = useState<'preset' | 'ai'>('preset');

  const saveContact = useSaveContact();
  const currentTopic = TOPICS.find((t) => t.id === selectedTopic) || TOPICS[0];

  // Refresh instant preset when contact, topic, or guide toggle changes
  useEffect(() => {
    if (!contact) return;
    const draft = buildInstantDraft(contact, selectedTopic, includeGuideLink);
    setSubject(draft.subject);
    setBody(draft.body);
    setDraftSource('preset');
  }, [contact, selectedTopic, includeGuideLink]);

  if (!contact) return null;

  const handleGenerateWithAI = async () => {
    setIsGeneratingAI(true);
    try {
      const result = await generateOutreachDraftWithAI({
        contactName: contact.name,
        contactEmail: contact.email,
        contactAddress: contact.address,
        contactNotes: contact.notes,
        topicTitle: currentTopic.title,
        topicSummary: currentTopic.description,
        customInstruction,
        includeGuideLink,
        guideUrl: currentTopic.guideUrl,
      });
      setSubject(result.subject);
      setBody(result.body);
      setDraftSource('ai');
      toast.success('Email tailored by Onboard AI');
    } catch (e: any) {
      toast.error(e?.message || 'Could not reach Onboard AI — you can still use or edit the preset draft.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const sentInfo = getOutreachSentInfo(contact.notes);
  const gmailUrl = buildGmailComposeUrl(contact.email || '', subject, body);
  const gmailTarget = getGmailLinkTarget();
  const mailtoUrl = buildMailtoUrl(contact.email || '', subject, body);

  const logOutreach = async () => {
    try {
      const topicTitle = TOPICS.find((t) => t.id === selectedTopic)?.title || selectedTopic;
      const today = new Date().toLocaleDateString();
      const tag = draftSource === 'ai' ? 'AI Outreach' : 'Outreach';
      const logEntry = `[${tag}: Emailed "${topicTitle}" on ${today}]`;
      const existingNotes = contact.notes || '';
      const updatedNotes = existingNotes ? `${existingNotes}\n${logEntry}` : logEntry;

      await saveContact.mutateAsync({
        ...contact,
        notes: updatedNotes,
        status: 'Active',
      });
    } catch {
      // quiet catch
    }
  };

  const handleMarkSent = async () => {
    await logOutreach();
    toast.success(`Marked ${contact.name} as Sent!`);
    onClose();
  };

  const handleOpenGmail = () => {
    const truncated = isBodyTruncatedForUrl(body);
    if (truncated && navigator.clipboard) {
      navigator.clipboard.writeText(body).catch(() => {});
    }
    logOutreach();
    toast.success(
      truncated
        ? 'Opened in Gmail & marked Sent! Full message copied to clipboard in case Gmail trims long text.'
        : 'Opened in Gmail & marked as Sent!',
    );
    setTimeout(() => onClose(), 300);
  };

  const handleOpenMailto = () => {
    const truncated = isBodyTruncatedForUrl(body);
    if (truncated && navigator.clipboard) {
      navigator.clipboard.writeText(body).catch(() => {});
    }
    logOutreach();
    toast.success(
      truncated
        ? 'Opened Mail App & marked Sent! Full message copied to clipboard.'
        : 'Opened Mail App & marked as Sent!',
    );
    setTimeout(() => onClose(), 300);
  };

  const handleCopy = async () => {
    try {
      const toLine = contact.email?.trim() ? `To: ${contact.email.trim()}\n` : '';
      const plain = `${toLine}Subject: ${subject}\n\n${body}`;
      const escapeHtml = (s: string) =>
        s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const linkify = (s: string) =>
        escapeHtml(s).replace(
          /(https?:\/\/[^\s<]+)/g,
          (url) => {
            const label = url === currentTopic.guideUrl
              ? currentTopic.guideTitle
              : url.replace(/^https?:\/\//, '');
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
          },
        );
      const logoUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://of-studio-manager.lovable.app'}/of-email-logo.png`;
      const logoHtml = `<div style="margin-top:12px;"><a href="https://organicfinishesllc.org" target="_blank" rel="noopener noreferrer"><img src="${logoUrl}" alt="Organic Finishes — Paint &amp; Plaster" width="200" style="display:block;border-radius:6px;max-width:200px;height:auto;" /></a></div>`;
      const html = `<div>${linkify(body).replace(/\n/g, '<br/>')}${logoHtml}</div>`;

      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([plain], { type: 'text/plain' }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(plain);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      await logOutreach();
      toast.success('Rich clickable email copied & marked as Sent!');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const copyQuickField = async (label: string, value: string) => {
    if (!value.trim()) return;
    try {
      await navigator.clipboard.writeText(value.trim());
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-5 sm:p-6">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="font-serif text-lg truncate">Email Outreach — {contact.name}</DialogTitle>
                {sentInfo.sent && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                    <Check className="h-3 w-3" />
                    Sent{sentInfo.lastSentDate ? ` · ${sentInfo.lastSentDate}` : ''}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <p className="text-xs text-muted-foreground truncate">
                  {contact.email ? `To: ${contact.email}` : 'No email on file — enter recipient in Gmail or copy draft'}
                </p>
                {contact.email && (
                  <button
                    type="button"
                    onClick={() => copyQuickField('Email address', contact.email || '')}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-accent hover:bg-accent/80 text-[10px] font-semibold text-foreground transition-colors"
                    title="Copy recipient email address"
                  >
                    <Copy className="h-2.5 w-2.5" />
                    Copy To
                  </button>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto no-scrollbar py-2 pr-1 flex-1">
          {/* Topic Selector */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
              1. Pick Topic / Attachment Focus
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TOPICS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTopic(t.id)}
                  className={`text-left p-2.5 rounded-xl border text-xs transition-all ${
                    selectedTopic === t.id
                      ? 'border-primary bg-primary/10 shadow-sm text-foreground ring-1 ring-primary/40'
                      : 'border-border bg-card/60 hover:bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <p className="font-semibold text-xs text-foreground">{t.title}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{t.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Guide Attachment Link Toggle */}
          <label className="flex items-center justify-between p-3 rounded-xl bg-accent/40 border border-border cursor-pointer">
            <div className="flex items-center gap-2.5">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="text-xs font-medium text-foreground">Include "{currentTopic.guideTitle}" link</p>
                <p className="text-[11px] text-muted-foreground">Auto-links on Send in Gmail (or pastes as a clickable link via Copy Draft)</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={includeGuideLink}
              onChange={(e) => setIncludeGuideLink(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
            />
          </label>

          {/* Onboard AI Customizer */}
          <div className="p-3 rounded-xl bg-card border border-primary/25 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                2. Tailor with Onboard AI (Optional)
              </label>
              <span className="text-[10px] text-muted-foreground">Uses contact notes & OF rules</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value)}
                placeholder="e.g. Mention their Tulsa retail build-out and waterproof shower rules..."
                className="flex-1 bg-accent border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleGenerateWithAI}
                disabled={isGeneratingAI}
                className="text-xs shrink-0 border border-primary/30 hover:border-primary/60"
              >
                {isGeneratingAI ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Drafting...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" />
                    Generate with AI
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Subject Line */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Subject Line
              </label>
              <button
                type="button"
                onClick={() => copyQuickField('Subject', subject)}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-accent hover:bg-accent/80 text-[10px] font-semibold text-foreground transition-colors"
                title="Copy subject line"
              >
                <Copy className="h-2.5 w-2.5" />
                Copy Subject
              </button>
            </div>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-accent border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Body Editor */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Email Message
              </label>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-primary" />
                {draftSource === 'ai' ? 'Tailored by Onboard AI' : 'Instant Preset (Editable)'}
              </span>
            </div>
            <textarea
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full bg-accent border border-border rounded-xl p-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary font-mono text-[11px] leading-relaxed resize-y"
            />
            <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-border bg-accent/50 p-2.5">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src="/of-email-logo.png"
                  alt="Organic Finishes — Paint & Plaster"
                  className="h-10 w-auto rounded-md border border-border/60 shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-foreground">Signature Logo</p>
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    Auto-included in <strong>Copy Draft</strong>. For <strong>Open in Gmail</strong>, add it once in Gmail Settings → Signature.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  copyQuickField(
                    'Logo image URL',
                    `${typeof window !== 'undefined' ? window.location.origin : 'https://of-studio-manager.lovable.app'}/of-email-logo.png`,
                  )
                }
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-border bg-card hover:bg-accent text-[10px] font-semibold text-foreground shrink-0 transition-colors"
                title="Copy hosted logo URL for Gmail Settings → Signature"
              >
                <Copy className="h-2.5 w-2.5" />
                Logo URL
              </button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-3 border-t border-border mt-2">
          <div className="flex items-center gap-1.5">
            <Button type="button" variant="ghost" size="sm" onClick={handleCopy} className="text-xs">
              {copied ? <Check className="h-3.5 w-3.5 mr-1.5 text-primary" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
              {copied ? 'Copied' : 'Copy Draft'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleMarkSent}
              className="text-xs text-emerald-400 hover:text-emerald-300"
              title="Mark this contact as emailed without opening a mail client"
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Mark Sent
            </Button>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="text-xs flex-1 sm:flex-initial"
              title="Open default mail app (best on phone)"
            >
              <a href={mailtoUrl} target="_top" onClick={handleOpenMailto}>
                <Smartphone className="h-3.5 w-3.5 mr-1.5" />
                Mail App
              </a>
            </Button>
            <Button
              asChild
              size="sm"
              className="text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow flex-1 sm:flex-initial"
            >
              <a
                href={gmailUrl}
                target={gmailTarget}
                rel={gmailTarget === '_blank' ? 'noopener noreferrer' : undefined}
                onClick={handleOpenGmail}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Open in Gmail
              </a>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
