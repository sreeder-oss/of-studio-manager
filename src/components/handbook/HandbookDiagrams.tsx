import React from 'react';

export type DiagramId =
  | 'studio-workflow'
  | 'outreach-pipeline'
  | 'contacts-projects'
  | 'visualizer-flow'
  | 'pricing-engine'
  | 'estimate-invoice'
  | 'receipts-tax'
  | 'quick-reference';

const NAVY_BG = '#131b27';
const CARD_BG = '#1e2838';
const CARD_BORDER = '#2e3c52';
const GREEN = '#49a33d';
const GREEN_SOFT = 'rgba(73, 163, 61, 0.16)';
const GOLD = '#d9a441';
const GOLD_SOFT = 'rgba(217, 164, 65, 0.16)';
const TEXT = '#e6dfd1';
const MUTED = '#95a3b8';

const DiagramFrame: React.FC<{
  caption: string;
  tag: string;
  children: React.ReactNode;
}> = ({ caption, tag, children }) => (
  <figure className="rounded-2xl border border-border/80 bg-[#131b27] overflow-hidden shadow-lg">
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 bg-card/40">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#d9a441]">
        {tag}
      </span>
      <span className="text-[10px] font-mono text-muted-foreground">
        ORGANIC FINISHES · STUDIO BLUEPRINT
      </span>
    </div>
    <div className="p-3 sm:p-5 overflow-x-auto">{children}</div>
    <figcaption className="px-4 py-2.5 border-t border-border/60 bg-card/30 text-xs text-muted-foreground">
      {caption}
    </figcaption>
  </figure>
);

const ArrowDefs: React.FC<{ id: string }> = ({ id }) => (
  <defs>
    <marker
      id={`${id}-green`}
      viewBox="0 0 10 10"
      refX="8"
      refY="5"
      markerWidth="6"
      markerHeight="6"
      orient="auto-start-reverse"
    >
      <path d="M 0 1 L 10 5 L 0 9 z" fill={GREEN} />
    </marker>
    <marker
      id={`${id}-gold`}
      viewBox="0 0 10 10"
      refX="8"
      refY="5"
      markerWidth="6"
      markerHeight="6"
      orient="auto-start-reverse"
    >
      <path d="M 0 1 L 10 5 L 0 9 z" fill={GOLD} />
    </marker>
    <pattern id={`${id}-grid`} width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#223045" strokeWidth="0.6" />
    </pattern>
  </defs>
);

/** Ch 1 — End-to-End Studio Workflow */
const StudioWorkflowDiagram: React.FC = () => (
  <DiagramFrame
    tag="VISUAL 01 · END-TO-END FLOW"
    caption="Every job moves cleanly from cold outreach to paid invoice and tax-ready books without duplicate data entry."
  >
    <svg viewBox="0 0 760 190" className="w-full min-w-[540px] h-auto" role="img" aria-label="End-to-end studio workflow diagram">
      <ArrowDefs id="wf" />
      <rect width="760" height="190" rx="12" fill="url(#wf-grid)" />

      {[
        { x: 18, step: '01', title: 'Outreach', sub: 'Lead Scout & Gmail', color: GOLD, soft: GOLD_SOFT },
        { x: 166, step: '02', title: 'Project', sub: 'Client & Site Walk', color: GREEN, soft: GREEN_SOFT },
        { x: 314, step: '03', title: 'Visualizer', sub: 'AI Finish Concept', color: GREEN, soft: GREEN_SOFT },
        { x: 462, step: '04', title: 'Estimate', sub: 'Price Book Math', color: GOLD, soft: GOLD_SOFT },
        { x: 610, step: '05', title: 'Invoice & Tax', sub: 'Paid + Receipts', color: GREEN, soft: GREEN_SOFT },
      ].map((n, i) => (
        <g key={n.step}>
          <rect x={n.x} y={36} width="132" height="114" rx="14" fill={CARD_BG} stroke={n.color} strokeWidth="1.5" />
          <rect x={n.x + 12} y={48} width="34" height="20" rx="6" fill={n.soft} />
          <text x={n.x + 29} y={62} textAnchor="middle" fill={n.color} fontSize="10" fontWeight="700" fontFamily="IBM Plex Mono, monospace">
            {n.step}
          </text>
          <text x={n.x + 12} y={96} fill={TEXT} fontSize="14" fontWeight="700" fontFamily="DM Serif Display, serif">
            {n.title}
          </text>
          <text x={n.x + 12} y={116} fill={MUTED} fontSize="10.5" fontFamily="Open Sans, sans-serif">
            {n.sub}
          </text>
          <line x1={n.x + 12} y1={132} x2={n.x + 118} y2={132} stroke={CARD_BORDER} strokeWidth="1" />
          {i < 4 && (
            <line
              x1={n.x + 132}
              y1={93}
              x2={n.x + 146}
              y2={93}
              stroke={n.color}
              strokeWidth="2"
              markerEnd={`url(#wf-${n.color === GOLD ? 'gold' : 'green'})`}
            />
          )}
        </g>
      ))}
    </svg>
  </DiagramFrame>
);

/** Ch 2 — Outreach Hub & Lead Verification Pipeline */
const OutreachPipelineDiagram: React.FC = () => (
  <DiagramFrame
    tag="VISUAL 02 · OUTREACH PIPELINE"
    caption="Cold leads stay isolated in Outreach until they reply. Live DNS MX checks keep bounce rates near zero."
  >
    <svg viewBox="0 0 760 220" className="w-full min-w-[540px] h-auto" role="img" aria-label="Outreach lead verification and Gmail handoff pipeline">
      <ArrowDefs id="out" />
      <rect width="760" height="220" rx="12" fill="url(#out-grid)" />

      {/* Sources */}
      <rect x="20" y="24" width="165" height="72" rx="12" fill={CARD_BG} stroke={GOLD} strokeWidth="1.4" />
      <text x="34" y="48" fill={GOLD} fontSize="10" fontWeight="700" fontFamily="IBM Plex Mono, monospace">AI LEAD SCOUT</text>
      <text x="34" y="67" fill={TEXT} fontSize="12" fontWeight="600">Playbooks + 1-Tap Save</text>
      <text x="34" y="83" fill={MUTED} fontSize="10">Dedupe & junk guard</text>

      <rect x="20" y="120" width="165" height="72" rx="12" fill={CARD_BG} stroke={GOLD} strokeWidth="1.4" />
      <text x="34" y="144" fill={GOLD} fontSize="10" fontWeight="700" fontFamily="IBM Plex Mono, monospace">VERIFY LEADS MODAL</text>
      <text x="34" y="163" fill={TEXT} fontSize="12" fontWeight="600">Paste / Missing Emails</text>
      <text x="34" y="179" fill={MUTED} fontSize="10">Auto-save + CSV export</text>

      {/* Arrows to MX check */}
      <path d="M 185 60 C 215 60, 215 108, 245 108" fill="none" stroke={GOLD} strokeWidth="1.8" markerEnd="url(#out-gold)" />
      <path d="M 185 156 C 215 156, 215 108, 245 108" fill="none" stroke={GOLD} strokeWidth="1.8" markerEnd="url(#out-gold)" />

      {/* MX Verification Engine */}
      <rect x="250" y="54" width="195" height="108" rx="14" fill={CARD_BG} stroke={GREEN} strokeWidth="1.8" />
      <rect x="266" y="68" width="108" height="20" rx="6" fill={GREEN_SOFT} />
      <text x="320" y="81" textAnchor="middle" fill={GREEN} fontSize="9.5" fontWeight="700" fontFamily="IBM Plex Mono, monospace">GOOGLE DNS MX</text>
      <text x="266" y="108" fill={TEXT} fontSize="13.5" fontWeight="700" fontFamily="DM Serif Display, serif">Live Verification</text>
      <text x="266" y="128" fill={MUTED} fontSize="10.5">Checks domain MX records</text>
      <text x="266" y="145" fill={MUTED} fontSize="10.5">Blocks dead / bogus hosts</text>

      <line x1="445" y1="108" x2="482" y2="108" stroke={GREEN} strokeWidth="2" markerEnd="url(#out-green)" />

      {/* Gmail Handoff */}
      <rect x="490" y="34" width="248" height="148" rx="14" fill={CARD_BG} stroke={GOLD} strokeWidth="1.6" />
      <text x="508" y="58" fill={GOLD} fontSize="10" fontWeight="700" fontFamily="IBM Plex Mono, monospace">1-TAP GMAIL COMPOSE</text>
      <text x="508" y="80" fill={TEXT} fontSize="14" fontWeight="700" fontFamily="DM Serif Display, serif">Android · iOS · Desktop</text>
      <rect x="508" y="94" width="212" height="24" rx="6" fill={NAVY_BG} stroke={CARD_BORDER} />
      <text x="518" y="110" fill={TEXT} fontSize="10" fontFamily="IBM Plex Mono, monospace">OF Logo + Instagram Signature</text>
      <rect x="508" y="126" width="100" height="22" rx="6" fill={GREEN_SOFT} />
      <text x="558" y="140" textAnchor="middle" fill={GREEN} fontSize="9.5" fontWeight="700">Copy To / Subj</text>
      <rect x="616" y="126" width="104" height="22" rx="6" fill={GOLD_SOFT} />
      <text x="668" y="140" textAnchor="middle" fill={GOLD} fontSize="9.5" fontWeight="700">Open in Gmail</text>
      <text x="508" y="168" fill={MUTED} fontSize="10">Promote to Estimate when warm</text>
    </svg>
  </DiagramFrame>
);

/** Ch 3 — Contacts vs Outreach & Project Workspace */
const ContactsProjectsDiagram: React.FC = () => (
  <DiagramFrame
    tag="VISUAL 03 · CLEAN SEPARATION"
    caption="Cold prospects stay in Outreach so your Contacts directory and Estimate client picker stay focused on active clients."
  >
    <svg viewBox="0 0 760 210" className="w-full min-w-[540px] h-auto" role="img" aria-label="Contacts vs Outreach separation and Project Workspace">
      <ArrowDefs id="cp" />
      <rect width="760" height="210" rx="12" fill="url(#cp-grid)" />

      {/* Left: Two directories */}
      <rect x="20" y="22" width="215" height="74" rx="12" fill={CARD_BG} stroke={GOLD} strokeWidth="1.5" />
      <text x="36" y="46" fill={GOLD} fontSize="10" fontWeight="700" fontFamily="IBM Plex Mono, monospace">/OUTREACH</text>
      <text x="36" y="66" fill={TEXT} fontSize="13.5" fontWeight="700" fontFamily="DM Serif Display, serif">Cold Outreach Leads</text>
      <text x="36" y="83" fill={MUTED} fontSize="10">Hidden from default estimate picker</text>

      <rect x="20" y="114" width="215" height="74" rx="12" fill={CARD_BG} stroke={GREEN} strokeWidth="1.8" />
      <text x="36" y="138" fill={GREEN} fontSize="10" fontWeight="700" fontFamily="IBM Plex Mono, monospace">/CONTACTS</text>
      <text x="36" y="158" fill={TEXT} fontSize="13.5" fontWeight="700" fontFamily="DM Serif Display, serif">Active Clients & Vendors</text>
      <text x="36" y="175" fill={MUTED} fontSize="10">Primary directory for live jobs</text>

      {/* Arrow */}
      <path d="M 235 59 C 268 59, 268 151, 235 151" fill="none" stroke={GOLD} strokeWidth="1.4" strokeDasharray="4 3" />
      <text x="275" y="109" fill={GOLD} fontSize="9.5" fontFamily="IBM Plex Mono, monospace">Promote</text>
      <line x1="235" y1="151" x2="345" y2="105" stroke={GREEN} strokeWidth="2" markerEnd="url(#cp-green)" />

      {/* Right: Project Workspace */}
      <rect x="355" y="22" width="385" height="166" rx="16" fill={CARD_BG} stroke={GREEN} strokeWidth="1.8" />
      <text x="375" y="48" fill={GREEN} fontSize="10" fontWeight="700" fontFamily="IBM Plex Mono, monospace">PROJECT WORKSPACE (/PROJECTS/:ID)</text>
      <text x="375" y="70" fill={TEXT} fontSize="15" fontWeight="700" fontFamily="DM Serif Display, serif">Single Hub for Every Jobsite</text>

      {[
        { x: 375, y: 86, w: 165, title: 'Site Photos & Concepts', sub: 'Raw captures + Visualizer PNGs' },
        { x: 554, y: 86, w: 165, title: 'Estimates (Handoff)', sub: 'Pre-linked projectId & client' },
        { x: 375, y: 136, w: 165, title: 'Change Orders', sub: 'Scope additions & approvals' },
        { x: 554, y: 136, w: 165, title: 'Invoices & Receipts', sub: 'Job costing & billing history' },
      ].map((b) => (
        <g key={b.title}>
          <rect x={b.x} y={b.y} width={b.w} height="40" rx="8" fill={NAVY_BG} stroke={CARD_BORDER} />
          <text x={b.x + 10} y={b.y + 17} fill={TEXT} fontSize="10.5" fontWeight="600">{b.title}</text>
          <text x={b.x + 10} y={b.y + 31} fill={MUTED} fontSize="9.2">{b.sub}</text>
        </g>
      ))}
    </svg>
  </DiagramFrame>
);

/** Ch 4 — AI Finish Visualizer Flow */
const VisualizerFlowDiagram: React.FC = () => (
  <DiagramFrame
    tag="VISUAL 04 · AI FINISH VISUALIZER"
    caption="Capture a wall on a site walk, apply an authentic Organic Finishes sample board, and present a branded Before/After Concept Card."
  >
    <svg viewBox="0 0 760 215" className="w-full min-w-[540px] h-auto" role="img" aria-label="AI Finish Visualizer site-walk to concept card flow">
      <ArrowDefs id="vis" />
      <rect width="760" height="215" rx="12" fill="url(#vis-grid)" />

      {/* Inputs */}
      <rect x="18" y="22" width="185" height="52" rx="10" fill={CARD_BG} stroke={GREEN} strokeWidth="1.4" />
      <text x="32" y="43" fill={GREEN} fontSize="9.5" fontWeight="700" fontFamily="IBM Plex Mono, monospace">1. SITE-WALK PHOTO</text>
      <text x="32" y="61" fill={TEXT} fontSize="11">Rear camera or upload</text>

      <rect x="18" y="84" width="185" height="52" rx="10" fill={CARD_BG} stroke={GOLD} strokeWidth="1.4" />
      <text x="32" y="105" fill={GOLD} fontSize="9.5" fontWeight="700" fontFamily="IBM Plex Mono, monospace">2. OF SAMPLE PRESET</text>
      <text x="32" y="123" fill={TEXT} fontSize="11">4 real OF boards / work</text>

      <rect x="18" y="146" width="185" height="48" rx="10" fill={CARD_BG} stroke={CARD_BORDER} strokeWidth="1.2" />
      <text x="32" y="166" fill={MUTED} fontSize="9.5" fontWeight="700" fontFamily="IBM Plex Mono, monospace">3. OPTIONAL INSPIRATION</text>
      <text x="32" y="182" fill={TEXT} fontSize="10.5">Client reference photo</text>

      {/* Connector lines */}
      <path d="M 203 48 L 245 108" stroke={GREEN} strokeWidth="1.6" markerEnd="url(#vis-green)" />
      <line x1="203" y1="110" x2="245" y2="110" stroke={GOLD} strokeWidth="1.6" markerEnd="url(#vis-gold)" />
      <path d="M 203 170 L 245 112" stroke={MUTED} strokeWidth="1.4" strokeDasharray="3 3" />

      {/* Center: Craftsmanship Pills */}
      <rect x="252" y="44" width="215" height="130" rx="14" fill={CARD_BG} stroke={GREEN} strokeWidth="1.8" />
      <text x="268" y="68" fill={GREEN} fontSize="10" fontWeight="700" fontFamily="IBM Plex Mono, monospace">FINISH SYSTEM PILLS</text>
      <text x="268" y="90" fill={TEXT} fontSize="13.5" fontWeight="700" fontFamily="DM Serif Display, serif">Craftsmanship Controls</text>
      {[
        { x: 268, y: 102, w: 62, label: 'Biolime' },
        { x: 336, y: 102, w: 72, label: 'Venetian' },
        { x: 414, y: 102, w: 42, label: 'Clay' },
        { x: 268, y: 128, w: 68, label: 'Tadelakt' },
        { x: 342, y: 128, w: 82, label: 'Microcement' },
      ].map((p) => (
        <g key={p.label}>
          <rect x={p.x} y={p.y} width={p.w} height="20" rx="10" fill={GREEN_SOFT} stroke={GREEN} strokeWidth="0.8" />
          <text x={p.x + p.w / 2} y={p.y + 13.5} textAnchor="middle" fill={TEXT} fontSize="9.5">{p.label}</text>
        </g>
      ))}
      <text x="268" y="164" fill={MUTED} fontSize="9.5">+ 1-line Refine box for quick tweaks</text>

      <line x1="467" y1="109" x2="504" y2="109" stroke={GOLD} strokeWidth="2" markerEnd="url(#vis-gold)" />

      {/* Output: Concept Card */}
      <rect x="512" y="34" width="230" height="150" rx="14" fill={CARD_BG} stroke={GOLD} strokeWidth="1.8" />
      <text x="528" y="58" fill={GOLD} fontSize="10" fontWeight="700" fontFamily="IBM Plex Mono, monospace">PRESENTATION & EXPORT</text>
      {/* Mini split slider illustration */}
      <rect x="528" y="70" width="198" height="64" rx="8" fill={NAVY_BG} stroke={CARD_BORDER} />
      <rect x="528" y="70" width="99" height="64" rx="8" fill="#233044" />
      <line x1="627" y1="70" x2="627" y2="134" stroke={GOLD} strokeWidth="2" />
      <circle cx="627" cy="102" r="9" fill={GOLD} />
      <text x="576" y="106" textAnchor="middle" fill={MUTED} fontSize="10" fontWeight="700">BEFORE</text>
      <text x="677" y="106" textAnchor="middle" fill={GREEN} fontSize="10" fontWeight="700">AFTER</text>
      <text x="528" y="154" fill={TEXT} fontSize="10.5" fontWeight="600">Save Concept to Project</text>
      <text x="528" y="170" fill={MUTED} fontSize="9.8">Download Navy Branded PNG Card</text>
    </svg>
  </DiagramFrame>
);

/** Ch 5 — Deterministic Pricing Architecture */
const PricingEngineDiagram: React.FC = () => (
  <DiagramFrame
    tag="VISUAL 05 · DETERMINISTIC PRICING RULE"
    caption="AI never guesses or invents dollar totals. It extracts scope at temperature 0; src/lib/pricing.ts computes every cent from your Price Book."
  >
    <svg viewBox="0 0 760 210" className="w-full min-w-[540px] h-auto" role="img" aria-label="Deterministic client-side pricing architecture">
      <ArrowDefs id="prc" />
      <rect width="760" height="210" rx="12" fill="url(#prc-grid)" />

      {/* AI Scope Extractor */}
      <rect x="20" y="42" width="196" height="126" rx="14" fill={CARD_BG} stroke={GOLD} strokeWidth="1.6" />
      <rect x="34" y="56" width="126" height="20" rx="6" fill={GOLD_SOFT} />
      <text x="97" y="69" textAnchor="middle" fill={GOLD} fontSize="9.5" fontWeight="700" fontFamily="IBM Plex Mono, monospace">AI · TEMP 0 ONLY</text>
      <text x="34" y="100" fill={TEXT} fontSize="14" fontWeight="700" fontFamily="DM Serif Display, serif">Scope Extraction</text>
      <text x="34" y="120" fill={MUTED} fontSize="10">Strict emit_scope tool</text>
      <text x="34" y="136" fill={MUTED} fontSize="10">Rooms, SF, finishes</text>
      <text x="34" y="154" fill={GOLD} fontSize="9.5" fontWeight="700">Zero price math in AI</text>

      <line x1="216" y1="105" x2="254" y2="105" stroke={GOLD} strokeWidth="2" markerEnd="url(#prc-gold)" />

      {/* Client-side Pricing Engine */}
      <rect x="262" y="24" width="276" height="162" rx="14" fill={CARD_BG} stroke={GREEN} strokeWidth="2" />
      <text x="280" y="48" fill={GREEN} fontSize="10" fontWeight="700" fontFamily="IBM Plex Mono, monospace">SRC/LIB/PRICING.TS (CLIENT-SIDE)</text>
      <text x="280" y="70" fill={TEXT} fontSize="14.5" fontWeight="700" fontFamily="DM Serif Display, serif">2026–2027 Rate Card Math</text>

      <rect x="280" y="84" width="240" height="26" rx="6" fill={NAVY_BG} stroke={CARD_BORDER} />
      <text x="292" y="101" fill={TEXT} fontSize="10.5">Labor = Flat SF / Day Rate (Price Book)</text>

      <rect x="280" y="116" width="240" height="26" rx="6" fill={NAVY_BG} stroke={CARD_BORDER} />
      <text x="292" y="133" fill={TEXT} fontSize="10.5">Materials = Coverage × Coats × Waste</text>

      <rect x="280" y="148" width="240" height="26" rx="6" fill={GREEN_SOFT} stroke={GREEN} strokeWidth="0.9" />
      <text x="292" y="165" fill={GREEN} fontSize="10.2" fontWeight="700">Pass-through materials · No hidden markup</text>

      <line x1="538" y1="105" x2="574" y2="105" stroke={GREEN} strokeWidth="2" markerEnd="url(#prc-green)" />

      {/* Auditable Output */}
      <rect x="582" y="42" width="158" height="126" rx="14" fill={CARD_BG} stroke={GOLD} strokeWidth="1.6" />
      <text x="598" y="68" fill={GOLD} fontSize="10" fontWeight="700" fontFamily="IBM Plex Mono, monospace">AUDITED TOTAL</text>
      <text x="598" y="92" fill={TEXT} fontSize="14" fontWeight="700" fontFamily="DM Serif Display, serif">Exact Estimate</text>
      <text x="598" y="114" fill={MUTED} fontSize="10">15 Unified Services</text>
      <text x="598" y="130" fill={MUTED} fontSize="10">16 Mfr. Systems</text>
      <text x="598" y="146" fill={MUTED} fontSize="10">Tax + Minimums</text>
    </svg>
  </DiagramFrame>
);

/** Ch 6 — Estimate to Invoice Lifecycle */
const EstimateInvoiceDiagram: React.FC = () => (
  <DiagramFrame
    tag="VISUAL 06 · ESTIMATE → INVOICE LIFECYCLE"
    caption="Build from a Project or Contact, export a Darkest Navy branded PDF, and convert approved estimates straight into invoices."
  >
    <svg viewBox="0 0 760 175" className="w-full min-w-[540px] h-auto" role="img" aria-label="Estimate to Invoice lifecycle diagram">
      <ArrowDefs id="ei" />
      <rect width="760" height="175" rx="12" fill="url(#ei-grid)" />

      {[
        { x: 20, label: 'DRAFT', title: 'Estimate Create', sub: 'Auto-linked projectId', color: MUTED },
        { x: 205, label: 'SENT', title: 'Branded PDF', sub: 'Darkest Navy #1a2332', color: GOLD },
        { x: 390, label: 'APPROVED', title: 'Client Sign-Off', sub: 'Convert 1-click', color: GREEN },
        { x: 575, label: 'PAID', title: 'Invoice Settled', sub: 'Logged in Dashboard', color: GREEN },
      ].map((s, idx) => (
        <g key={s.label}>
          <rect x={s.x} y={36} width="160" height="104" rx="14" fill={CARD_BG} stroke={s.color} strokeWidth="1.6" />
          <text x={s.x + 14} y={60} fill={s.color} fontSize="10" fontWeight="700" fontFamily="IBM Plex Mono, monospace">
            {s.label}
          </text>
          <text x={s.x + 14} y={86} fill={TEXT} fontSize="14" fontWeight="700" fontFamily="DM Serif Display, serif">
            {s.title}
          </text>
          <text x={s.x + 14} y={108} fill={MUTED} fontSize="10.2">{s.sub}</text>
          {idx < 3 && (
            <line
              x1={s.x + 160}
              y1={88}
              x2={s.x + 180}
              y2={88}
              stroke={idx === 1 ? GOLD : GREEN}
              strokeWidth="2"
              markerEnd={`url(#ei-${idx === 1 ? 'gold' : 'green'})`}
            />
          )}
        </g>
      ))}
    </svg>
  </DiagramFrame>
);

/** Ch 7 — Receipts & Tax Summary Flow */
const ReceiptsTaxDiagram: React.FC = () => (
  <DiagramFrame
    tag="VISUAL 07 · JOB COSTING & TAX PREP"
    caption="Snap material and supply receipts on the go so year-end Schedule C totals and job profitability stay current."
  >
    <svg viewBox="0 0 760 185" className="w-full min-w-[540px] h-auto" role="img" aria-label="Receipts capture to Tax Summary diagram">
      <ArrowDefs id="rt" />
      <rect width="760" height="185" rx="12" fill="url(#rt-grid)" />

      <rect x="24" y="34" width="210" height="118" rx="14" fill={CARD_BG} stroke={GOLD} strokeWidth="1.6" />
      <text x="40" y="58" fill={GOLD} fontSize="10" fontWeight="700" fontFamily="IBM Plex Mono, monospace">1. CAPTURE (/RECEIPTS)</text>
      <text x="40" y="82" fill={TEXT} fontSize="14" fontWeight="700" fontFamily="DM Serif Display, serif">Photo & Entry</text>
      <text x="40" y="104" fill={MUTED} fontSize="10.2">Vendor, date, total & tax</text>
      <text x="40" y="122" fill={MUTED} fontSize="10.2">Attach to Project or Overhead</text>

      <line x1="234" y1="93" x2="270" y2="93" stroke={GOLD} strokeWidth="2" markerEnd="url(#rt-gold)" />

      <rect x="278" y="34" width="204" height="118" rx="14" fill={CARD_BG} stroke={GREEN} strokeWidth="1.6" />
      <text x="294" y="58" fill={GREEN} fontSize="10" fontWeight="700" fontFamily="IBM Plex Mono, monospace">2. CATEGORIZE</text>
      <text x="294" y="82" fill={TEXT} fontSize="14" fontWeight="700" fontFamily="DM Serif Display, serif">Clean Buckets</text>
      <text x="294" y="104" fill={MUTED} fontSize="10.2">Plaster / Paint Materials</text>
      <text x="294" y="122" fill={MUTED} fontSize="10.2">Tools, Fuel, Studio Supplies</text>

      <line x1="482" y1="93" x2="518" y2="93" stroke={GREEN} strokeWidth="2" markerEnd="url(#rt-green)" />

      <rect x="526" y="34" width="210" height="118" rx="14" fill={CARD_BG} stroke={GOLD} strokeWidth="1.6" />
      <text x="542" y="58" fill={GOLD} fontSize="10" fontWeight="700" fontFamily="IBM Plex Mono, monospace">3. REPORT (/REPORTS/TAX)</text>
      <text x="542" y="82" fill={TEXT} fontSize="14" fontWeight="700" fontFamily="DM Serif Display, serif">Tax Summary</text>
      <text x="542" y="104" fill={MUTED} fontSize="10.2">Revenue vs. Deductible Spend</text>
      <text x="542" y="122" fill={MUTED} fontSize="10.2">CPA-ready breakdown by year</text>
    </svg>
  </DiagramFrame>
);

/** Ch 8 — Quick Reference & PWA Reliability */
const QuickRefDiagram: React.FC = () => (
  <DiagramFrame
    tag="VISUAL 08 · FIELD RELIABILITY & UPDATES"
    caption="OF Studio Manager runs as an installable PWA with instant service-worker activation so updates reach your phone immediately."
  >
    <svg viewBox="0 0 760 175" className="w-full min-w-[540px] h-auto" role="img" aria-label="PWA updates and troubleshooting quick reference card">
      <ArrowDefs id="qr" />
      <rect width="760" height="175" rx="12" fill="url(#qr-grid)" />

      {[
        { x: 22, tag: 'PWA UPDATES', title: 'Instant Activation', line1: 'skipWaiting + clientsClaim', line2: 'Refresh once after deploy', color: GREEN },
        { x: 268, tag: 'GMAIL FALLBACK', title: 'Zero Blocked Tabs', line1: 'Standard Gmail compose URL', line2: '1-tap Copy To & Subject', color: GOLD },
        { x: 514, tag: 'LIVING DOCS', title: 'Zero-Drift Rule', line1: 'Update Handbook in same PR', line2: 'Enforced in AGENTS.md', color: GREEN },
      ].map((c) => (
        <g key={c.tag}>
          <rect x={c.x} y={26} width="224" height="122" rx="14" fill={CARD_BG} stroke={c.color} strokeWidth="1.6" />
          <text x={c.x + 16} y={52} fill={c.color} fontSize="10" fontWeight="700" fontFamily="IBM Plex Mono, monospace">
            {c.tag}
          </text>
          <text x={c.x + 16} y={78} fill={TEXT} fontSize="14.5" fontWeight="700" fontFamily="DM Serif Display, serif">
            {c.title}
          </text>
          <text x={c.x + 16} y={104} fill={MUTED} fontSize="10.5">{c.line1}</text>
          <text x={c.x + 16} y={124} fill={MUTED} fontSize="10.5">{c.line2}</text>
        </g>
      ))}
    </svg>
  </DiagramFrame>
);

export const HandbookDiagram: React.FC<{ id: DiagramId }> = ({ id }) => {
  switch (id) {
    case 'studio-workflow':
      return <StudioWorkflowDiagram />;
    case 'outreach-pipeline':
      return <OutreachPipelineDiagram />;
    case 'contacts-projects':
      return <ContactsProjectsDiagram />;
    case 'visualizer-flow':
      return <VisualizerFlowDiagram />;
    case 'pricing-engine':
      return <PricingEngineDiagram />;
    case 'estimate-invoice':
      return <EstimateInvoiceDiagram />;
    case 'receipts-tax':
      return <ReceiptsTaxDiagram />;
    case 'quick-reference':
      return <QuickRefDiagram />;
  }
};
