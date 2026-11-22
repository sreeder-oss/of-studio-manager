import React, { useState, useEffect } from 'react';
import { Mail, Sparkles, Copy, ExternalLink, Check, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { DbContact } from '@/hooks/useContacts';
import { useSaveContact } from '@/hooks/useContacts';

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
}

const TOPICS: TopicOption[] = [
  {
    id: 'microcement',
    title: 'Microcement Rules & Wet Area Specs',
    description: 'Seamless waterproof wet rooms, zero grout lines, substrate prep & mesh reinforcement',
    defaultSubject: 'Architectural Microcement Systems & CSI Div 09 Specs — Organic Finishes',
  },
  {
    id: 'commercial',
    title: 'Commercial GC Intro (HEPA & Off-Hours)',
    description: 'Festool HEPA dust extraction, overnight/off-hours shifts, single-point owner accountability',
    defaultSubject: 'Commercial Specialty Finishes & Off-Hours Subcontracting — Organic Finishes',
  },
  {
    id: 'venetian',
    title: 'Venetian & Specialty Lime Plaster',
    description: 'Italian Marmorino, Tadelakt, integral color, luxury residential & boutique retail',
    defaultSubject: 'Artisan Venetian & Lime Plaster Finishes — Organic Finishes',
  },
  {
    id: 'demofree',
    title: 'Demolition-Free Surface Renovations',
    description: 'Overlay sound tile, drywall & concrete without noisy demolition or landfill waste',
    defaultSubject: 'Demolition-Free Surface Transformations — Organic Finishes',
  },
];

const MICROCEMENT_GUIDE_URL = 'https://drive.google.com/file/d/1cRkoRKcM_2lx3dGBEoDO0ZHEDY9w-CXzRuumHdkZAAM/view';

export const OutreachEmailModal: React.FC<OutreachEmailModalProps> = ({ contact, isOpen, onClose }) => {
  const [selectedTopic, setSelectedTopic] = useState<OutreachTopic>('microcement');
  const [includeGuideLink, setIncludeGuideLink] = useState(true);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [copied, setCopied] = useState(false);

  const saveContact = useSaveContact();

  // Generate draft based on topic and contact
  useEffect(() => {
    if (!contact) return;

    const topic = TOPICS.find((t) => t.id === selectedTopic) || TOPICS[0];
    setSubject(topic.defaultSubject);

    const greeting = contact.name ? `Hi ${contact.name.split(' ')[0]},` : 'Hello,';
    const guideSection = includeGuideLink
      ? `\n\nFor architectural details and installation mechanics, you can view our technical guide here:\n• Microcement Design & Application Guide: ${MICROCEMENT_GUIDE_URL}\n• Portfolio & Systems: https://organicfinishesllc.org`
      : `\n\nPortfolio & Systems: https://organicfinishesllc.org`;

    let topicMessage = '';
    switch (selectedTopic) {
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

    const signoff = `\n\nI'd welcome the opportunity to review any upcoming drawings or provide preliminary budget numbers for your team.\n\nBest regards,\nShawn Reeder — Owner & Principal Applicator\nOrganic Finishes LLC\nDirect: (405) 816-0750\nEmail: contact@organicfinishesllc.org\norganicfinishesllc.org`;

    setBody(`${greeting}\n\n${topicMessage}${guideSection}${signoff}`);
  }, [contact, selectedTopic, includeGuideLink]);

  if (!contact) return null;

  const logOutreach = async () => {
    try {
      const topicTitle = TOPICS.find((t) => t.id === selectedTopic)?.title || selectedTopic;
      const today = new Date().toLocaleDateString();
      const logEntry = `[Outreach: Emailed "${topicTitle}" on ${today}]`;
      const existingNotes = contact.notes || '';
      const updatedNotes = existingNotes ? `${existingNotes}\n${logEntry}` : logEntry;

      await saveContact.mutateAsync({
        ...contact,
        notes: updatedNotes,
        status: contact.status === 'Inactive' ? 'Active' : contact.status,
      });
    } catch {
      // quiet catch
    }
  };

  const handleOpenGmail = () => {
    const toEmail = contact.email || '';
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(toEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
    logOutreach();
    toast.success('Opened in Gmail! Contact activity logged.');
    onClose();
  };

  const handleOpenMailto = () => {
    const toEmail = contact.email || '';
    const mailtoUrl = `mailto:${toEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
    logOutreach();
    toast.success('Opened in email app! Contact activity logged.');
    onClose();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      logOutreach();
      toast.success('Email draft copied to clipboard!');
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="font-serif text-lg">Send Outreach to {contact.name}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {contact.email ? `Sending to: ${contact.email}` : 'No email on file — copy draft or enter email'}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto no-scrollbar py-2 pr-1 flex-1">
          {/* Topic Selector */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
              Select Outreach Topic
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TOPICS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTopic(t.id)}
                  className={`text-left p-2.5 rounded-xl border text-xs transition-all ${
                    selectedTopic === t.id
                      ? 'border-primary bg-primary/5 shadow-sm text-foreground ring-1 ring-primary/40'
                      : 'border-border bg-card/60 hover:bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <p className="font-semibold text-[11px] text-foreground">{t.title}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{t.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Guide Attachment Link Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-accent/40 border border-border">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs font-medium text-foreground">Include Microcement Spec Guide link</p>
                <p className="text-[10px] text-muted-foreground">Adds direct PDF view link in email body</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={includeGuideLink}
              onChange={(e) => setIncludeGuideLink(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
            />
          </div>

          {/* Subject Line */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
              Subject Line
            </label>
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
                Email Message (Pre-filled by Onboard AI)
              </label>
              <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-primary" />
                Craftsman Tone
              </span>
            </div>
            <textarea
              rows={9}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full bg-accent border border-border rounded-xl p-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary font-mono text-[11px] leading-relaxed resize-none"
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-border mt-2">
          <Button type="button" variant="ghost" size="sm" onClick={handleCopy} className="text-xs w-full sm:w-auto">
            {copied ? <Check className="h-3.5 w-3.5 mr-1 text-green-500" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
            {copied ? 'Copied' : 'Copy Text'}
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenMailto}
              className="text-xs"
              title="Open system default email client"
            >
              Default Mail
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleOpenGmail}
              className="text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Open in Gmail
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
