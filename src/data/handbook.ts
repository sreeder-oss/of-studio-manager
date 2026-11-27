import type { DiagramId } from '@/components/handbook/HandbookDiagrams';

export type HandbookIconKey =
  | 'dashboard'
  | 'outreach'
  | 'projects'
  | 'visualizer'
  | 'pricebook'
  | 'estimates'
  | 'receipts'
  | 'settings';

export type CalloutTone = 'rule' | 'tip' | 'field';

export interface HandbookCallout {
  tone: CalloutTone;
  title: string;
  body: string;
}

export interface HandbookSection {
  id: string;
  heading: string;
  body: string;
  steps?: string[];
  bullets?: string[];
  callout?: HandbookCallout;
}

export interface HandbookChapter {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  route: string;
  routeLabel: string;
  iconKey: HandbookIconKey;
  tone: 'green' | 'gold';
  diagramId: DiagramId;
  summary: string;
  keywords: string[];
  sections: HandbookSection[];
}

export interface HandbookIndexEntry {
  term: string;
  chapterId: string;
  sectionId?: string;
  note: string;
}

export interface HandbookChangelogEntry {
  date: string;
  version: string;
  summary: string;
  chaptersUpdated: string[];
}

export const HANDBOOK_VERSION = 'v1.1';
export const HANDBOOK_LAST_UPDATED = 'November 27, 2026';

export const HANDBOOK_CHAPTERS: HandbookChapter[] = [
  {
    id: 'studio-overview',
    number: '01',
    title: 'Studio Overview & Setup',
    subtitle: 'How OF Studio Manager fits together — from first outreach to paid invoice',
    route: '/',
    routeLabel: 'Open Dashboard',
    iconKey: 'dashboard',
    tone: 'green',
    diagramId: 'studio-workflow',
    summary:
      'OF Studio Manager is the operating system for Organic Finishes LLC. Everything connects around five pillars: Outreach, Projects, Finish Visualizer, Estimates & Invoices, and Receipts & Tax.',
    keywords: [
      'dashboard',
      'overview',
      'workflow',
      'pwa',
      'brand',
      'navy',
      'settings',
      'minimums',
      'mobile',
      'studio icons',
    ],
    sections: [
      {
        id: 'daily-rhythm',
        heading: 'The 5-Stage Studio Workflow',
        body:
          'Every job follows a clean, predictable path so you never re-type client details or lose site-walk notes.',
        steps: [
          'Find and verify architect, designer, or GC leads in Outreach (/outreach) and send 1-tap Gmail introductions.',
          'Once a prospect replies, manage them as an active Client (/contacts) and open a Project (/projects) for the jobsite.',
          'On the site walk, capture wall photos in the AI Finish Visualizer (/visualizer) and save concepts right to the Project.',
          'Generate an auditable Estimate (/estimates/new) using your 2026–2027 Price Book and Systems Library.',
          'Convert approved estimates into Invoices (/invoices), log job Receipts (/receipts), and review Tax Summary (/reports/tax).',
        ],
      },
      {
        id: 'brand-and-settings',
        heading: 'Brand Identity & Studio Settings',
        body:
          'All client-facing outputs — Estimate PDFs, Invoice PDFs, Visualizer Concept Cards, and Outreach email signatures — share the Organic Finishes Darkest Navy Blue (#1a2332) brand board with Organic Green (#49a33d) and Gold (#d9a441) accents.',
        bullets: [
          'Configure studio minimums, default tax rate, and company profile in Settings (/settings).',
          'Desktop navigation splits into Operations (core daily workflow) and Catalog & Studio (reference & tools).',
          'On mobile PWA, use the bottom bar for Home, Estimates, Invoices, and Contacts, and tap More for Outreach, Finish Visualizer, Projects, Receipts, Price Book, Systems Library, Handbook, and Settings.',
        ],
        callout: {
          tone: 'field',
          title: 'Home Base & Travel Policy (Sand Springs / Tulsa, OK)',
          body: 'Day-commute radius is up to 1.5 hours from Sand Springs / Tulsa (profitable for short 1–2 day runs, up to ~5 days max). Jobs beyond 1.5 hours require hotel + food allowance in the estimate.',
        },
      },
    ],
  },
  {
    id: 'outreach-hub',
    number: '02',
    title: 'Outreach Hub & Lead Pipeline',
    subtitle: 'AI Lead Scout, Live DNS MX Verification, and 1-Tap Gmail Handoff',
    route: '/outreach',
    routeLabel: 'Open Outreach Hub',
    iconKey: 'outreach',
    tone: 'gold',
    diagramId: 'outreach-pipeline',
    summary:
      'Keep cold outreach prospects organized in their own dedicated workspace with live email domain checks, enrichment, and frictionless Gmail compose across Android, iOS, and Desktop.',
    keywords: [
      'outreach',
      'leads',
      'lead scout',
      'verify leads',
      'mx',
      'dns',
      'gmail',
      'instagram',
      'signature',
      'csv',
      'enrich',
      'clipboard',
      'copy to',
      'copy subject',
    ],
    sections: [
      {
        id: 'lead-scout-and-verifier',
        heading: 'Finding & Verifying Clean Leads',
        body:
          'Never waste outreach on dead domains or duplicate entries. Outreach includes both AI Lead Scout playbooks and a 2-tab Verify Leads modal.',
        steps: [
          'Click Lead Scout to run targeted playbooks (custom home builders, interior designers, architects) and use 1-tap Save All Verified Leads with built-in dedupe & junk filtering.',
          'Use Verify Leads → Paste from Gemini / Doc to bulk-paste raw lead tables and verify every domain against live Google DNS MX records.',
          'Use the clickable Leads KPI Strip or Enrich Missing (N) shortcut to fill missing emails with auto-save-as-you-go and an instant Stop button.',
          'Export clean, formula-safe spreadsheets anytime via Export CSV.',
        ],
      },
      {
        id: 'gmail-handoff',
        heading: '1-Tap Gmail Compose & Signature',
        body:
          'Every email-ready lead opens directly into Gmail with your Organic Finishes signature logo and Instagram link ready to go.',
        bullets: [
          'Android uses native Gmail intent targeting com.google.android.gm; iOS uses googlegmail:///co; Desktop opens standard Gmail web compose (view=cm&fs=1&tf=cm).',
          'Use the 1-tap Copy To and Copy Subject buttons if you prefer composing manually or if a long email body approaches URL length limits.',
          'Once a lead replies and becomes a real opportunity, promote them straight into a new Estimate or active Client.',
        ],
        callout: {
          tone: 'field',
          title: 'Why Cold Leads Stay Out of Contacts',
          body: 'Cold leads live exclusively in /outreach so your active /contacts list and Estimate client picker stay clutter-free.',
        },
      },
    ],
  },
  {
    id: 'contacts-projects',
    number: '03',
    title: 'Contacts & Project Workspaces',
    subtitle: 'Active Clients, Vendors, and Centralized Jobsite Hubs',
    route: '/projects',
    routeLabel: 'Open Projects',
    iconKey: 'projects',
    tone: 'green',
    diagramId: 'contacts-projects',
    summary:
      'Track active clients and material vendors in Contacts, and organize every jobsite inside a Project Workspace that holds photos, visualizer concepts, estimates, change orders, and invoices.',
    keywords: [
      'contacts',
      'clients',
      'vendors',
      'projects',
      'jobsite',
      'change orders',
      'photos',
      'handoff',
      'projectId',
    ],
    sections: [
      {
        id: 'contacts-directory',
        heading: 'Contacts Directory (Clients, Middlemen & Vendors)',
        body:
          'Contacts (/contacts) focuses on people you actively work with — Homeowners, Interior Designers, Builders/GCs, Commercial accounts, and suppliers.',
        bullets: [
          'Bill-To vs. Middleman: On residential jobs, both the Homeowner and the Designer/Builder are your clients, but the Homeowner is usually the paying Bill-To client while the Designer/Builder acts as the middleman/specifier. Commercial jobs run differently since they draw from budgeted company funds.',
          'Click any contact to open Contact Detail (/contacts/:id) with their linked Projects, Estimates, Invoices, and quick Outreach route if applicable.',
          'When creating an Estimate, the client picker defaults to Active Clients only — flip the "Include Outreach Leads (N)" toggle if you want to quote a warm lead directly.',
        ],
      },
      {
        id: 'project-workspace',
        heading: 'Site-Walk Project Creation & Handoffs',
        body:
          'A Project (/projects/:id) is created the moment you are sent to look at a space for an estimate. If the job does not move forward, simply delete the Project while keeping the Contact on file.',
        steps: [
          'Launch Finish Visualizer directly from a Project so raw site-walk photos and generated concepts save automatically to that job.',
          'Click Create Estimate inside a Project to hand off the projectId and client automatically to /estimates/new.',
          'Log mid-job scope additions under the Change Orders tab so they merge cleanly into the final Invoice.',
        ],
      },
    ],
  },
  {
    id: 'finish-visualizer',
    number: '04',
    title: 'AI Finish Visualizer',
    subtitle: 'Site-Walk Capture, Organic Finishes Sample Boards & Before/After Concept Cards',
    route: '/visualizer',
    routeLabel: 'Open Finish Visualizer',
    iconKey: 'visualizer',
    tone: 'green',
    diagramId: 'visualizer-flow',
    summary:
      'Help clients picture Biolime, Venetian Marmorino, Limewash, Tadelakt, Microcement, Roman Clay, or Travertino on their actual walls during a site walk.',
    keywords: [
      'visualizer',
      'ai',
      'camera',
      'site walk',
      'sample board',
      'biolime',
      'venetian',
      'marmorino',
      'limewash',
      'tadelakt',
      'microcement',
      'roman clay',
      'travertino',
      'before after',
      'concept card',
      'refine',
    ],
    sections: [
      {
        id: 'site-walk-capture',
        heading: 'Capturing & Styling a Surface',
        body:
          'Open /visualizer on your phone during a walk-through (or from inside any Project) to turn a raw wall photo into a client-ready visual concept.',
        steps: [
          'Snap a photo with your rear camera or upload an existing room image. Tap Save Raw Photo to store the original in the project photo library.',
          'Choose one of the 4 real Organic Finishes sample/work presets (Limestone Plaster Fireplace, Charcoal Venetian Range Hood, Slaked Limewash Board, Metallic Copper-Bronze Board) or upload a Client Inspiration photo.',
          'Tap the craftsmanship finish pills (Biolime, Venetian Marmorino, Limewash, Tadelakt, Microcement, Roman Clay, Travertino) and generate.',
          'Use the 1-line Refine box to dial in sheen, warmth, mottling, or color depth without starting over.',
        ],
      },
      {
        id: 'presenting-concepts',
        heading: 'Presentation Mode & Concept Card Export',
        body:
          'Review concepts live with clients using the interactive Before/After drag slider or full-screen Presentation Mode.',
        bullets: [
          'Tap Save Concept to Project to attach the finished visual directly to the Project workspace.',
          'Tap Download Concept Card PNG for a Darkest Navy Blue (#1a2332) branded Before/After image ready to text or email to the client or designer.',
        ],
        callout: {
          tone: 'field',
          title: 'Best Lighting Tip on Site Walks',
          body: 'Shoot walls straight-on in even natural light and avoid heavy harsh shadows — the AI preserves architectural trim, sconces, and fireplace surrounds much more accurately.',
        },
      },
    ],
  },
  {
    id: 'pricing-and-systems',
    number: '05',
    title: 'Services, Systems & 2026–2027 Pricing',
    subtitle: 'Deterministic Client-Side Pricing, 15 Unified Services & 16 Manufacturer Systems',
    route: '/services',
    routeLabel: 'Open Price Book',
    iconKey: 'pricebook',
    tone: 'gold',
    diagramId: 'pricing-engine',
    summary:
      'Every dollar on an estimate is computed deterministically in src/lib/pricing.ts from your 2026–2027 regional Price Book and Systems Library — never guessed by AI.',
    keywords: [
      'pricing',
      'price book',
      'services',
      'systems',
      'systems library',
      'surecrete',
      'meoded',
      'vasari',
      'mineral',
      'rate card',
      'coverage',
      'coats',
      'waste',
      'minimums',
      'emit_scope',
      'deterministic',
    ],
    sections: [
      {
        id: 'deterministic-rule',
        heading: 'The Deterministic Pricing Rule',
        body:
          'OF Studio Manager enforces a strict boundary between AI scope extraction and financial math.',
        bullets: [
          'AI Assistant (ai-chat) runs at temperature 0 and only extracts structured scope (rooms, square footage, services) via the emit_scope tool.',
          'All pricing math runs client-side in src/lib/pricing.ts using your live Price Book and Systems Library.',
          'Labor is a flat rate per SF or per day from Services (profit is built into that rate). Materials pass through at cost using Coverage × Coats × (1 + Waste Factor) with no hidden markup.',
        ],
        callout: {
          tone: 'rule',
          title: 'Studio Rule: Auditable Numbers Only',
          body: 'If you ever update a rate in Price Book (/services) or coverage/cost in Systems Library (/systems), every new estimate immediately reflects that exact math with zero drift.',
        },
      },
      {
        id: 'catalog-structure',
        heading: 'Price Book & Systems Library',
        body:
          'Your 2026–2027 regional catalog is pre-aligned across both tables with duplicate seed protection.',
        bullets: [
          'Price Book (/services): 15 unified services covering lime plaster, Venetian plaster, limewash, tadelakt, microcement, specialty prep, and day-rate studio work.',
          'Systems Library (/systems): 16 manufacturer systems across SureCrete, Meoded, Vasari, and Mineral lines with coverage rates, coat counts, and unit costs.',
          'Job minimums are synced in Settings (/settings) so small accent walls or fireplace jobs never get underbid.',
        ],
      },
    ],
  },
  {
    id: 'estimates-invoices',
    number: '06',
    title: 'Estimates & Invoices',
    subtitle: 'Building Quotes, Branded Navy PDFs, and 1-Click Invoice Conversion',
    route: '/estimates',
    routeLabel: 'Open Estimates',
    iconKey: 'estimates',
    tone: 'green',
    diagramId: 'estimate-invoice',
    summary:
      'Create line-item estimates manually or from AI scope extraction, export polished Darkest Navy branded PDFs, and convert approved quotes straight into Invoices.',
    keywords: [
      'estimates',
      'invoices',
      'pdf',
      'quote',
      'proposal',
      'ai assistant',
      'convert',
      'payment',
      'status',
      'approved',
      'paid',
    ],
    sections: [
      {
        id: 'creating-estimates',
        heading: 'Creating & Sending an Estimate',
        body:
          'Start from /estimates/new, from a Project (auto-links projectId), or by describing the room to the Floating AI Assistant.',
        steps: [
          'Select the Client (and optional Project). Active Clients appear by default; toggle Include Outreach Leads if quoting a prospect.',
          'Add Service lines from your Price Book and pair Material Systems as needed — totals, waste, minimums, and tax calculate live.',
          'Review the Estimate Detail (/estimates/:id) and export the Darkest Navy Blue (#1a2332) branded PDF to send to the client.',
        ],
      },
      {
        id: 'converting-to-invoices',
        heading: 'Converting Approved Estimates & Change Orders to Invoices',
        body:
          'Once a client approves an estimate, convert it into an Invoice (/invoices) in one click so line items, client info, and project links carry over intact. Approved Change Orders merge into the final Invoice rather than creating separate bills.',
        bullets: [
          'Track invoice status (Draft, Sent, Paid, Overdue) from /invoices and the main Dashboard KPI cards.',
          'Download matching branded Invoice PDFs from Invoice Detail (/invoices/:id).',
        ],
      },
    ],
  },
  {
    id: 'receipts-tax',
    number: '07',
    title: 'Receipts & Tax Summary',
    subtitle: 'Expense Capture, Job Costing & Year-End Tax Preparation',
    route: '/receipts',
    routeLabel: 'Open Receipts',
    iconKey: 'receipts',
    tone: 'gold',
    diagramId: 'receipts-tax',
    summary:
      'Log material runs, specialty pigments, trowels, and studio expenses in seconds so your Tax Summary stays CPA-ready all year.',
    keywords: [
      'receipts',
      'expenses',
      'tax',
      'tax summary',
      'deductions',
      'schedule c',
      'materials',
      'job costing',
      'reports',
    ],
    sections: [
      {
        id: 'capturing-receipts',
        heading: 'Logging Material & Studio Receipts',
        body:
          'Snap or upload receipts right after a supply run in Receipts (/receipts) before they fade in the truck.',
        steps: [
          'Record vendor, date, total amount, and expense category (Materials, Tools, Fuel, Studio Overhead, etc.).',
          'Link job-specific material purchases to a Project so you can compare actual spend against estimated material cost.',
        ],
      },
      {
        id: 'tax-summary-report',
        heading: 'Reviewing Tax Summary',
        body:
          'Open Tax Summary (/reports/tax) anytime to see paid invoice revenue alongside categorized deductible expenses for the selected tax year.',
        callout: {
          tone: 'tip',
          title: 'Monthly 5-Minute Habit',
          body: 'Reconcile Receipts once a month against your business card statement so April tax prep is a single export instead of a weekend dig.',
        },
      },
    ],
  },
  {
    id: 'quick-reference',
    number: '08',
    title: 'Quick Reference & Living Docs',
    subtitle: 'Troubleshooting, Keyboard Tips & How This Handbook Stays Up to Date',
    route: '/settings',
    routeLabel: 'Open Settings',
    iconKey: 'settings',
    tone: 'gold',
    diagramId: 'quick-reference',
    summary:
      'Quick answers for field troubleshooting — PWA refreshes, Gmail compose fallbacks, and the living-documentation rule that keeps this Handbook current.',
    keywords: [
      'troubleshooting',
      'help',
      'faq',
      'pwa',
      'cache',
      'update',
      'gmail',
      'blocked',
      'handbook',
      'documentation',
      'changelog',
      'agents.md',
    ],
    sections: [
      {
        id: 'field-troubleshooting',
        heading: 'Common Field Fixes',
        body:
          'Fast checks if something behaves unexpectedly on phone or desktop:',
        bullets: [
          'Not seeing a brand-new update on mobile? Close and reopen the PWA (or pull-to-refresh once). skipWaiting + clientsClaim activates fresh builds automatically.',
          'Gmail compose tab looks truncated on a very long outreach draft? Tap Copy To and Copy Subject right inside the Outreach modal and paste into Gmail.',
          'Missing a lead in the Estimate client dropdown? Toggle "Include Outreach Leads" in the picker — cold leads are hidden by default to keep it clean.',
        ],
      },
      {
        id: 'living-handbook-rule',
        heading: 'How This Handbook Stays Updated',
        body:
          'Every time a new feature, route, workflow, or pricing rule is added to OF Studio Manager, the matching chapter and changelog in src/data/handbook.ts are updated in the same commit.',
        callout: {
          tone: 'rule',
          title: 'Zero-Drift Documentation Rule (AGENTS.md)',
          body: 'Documentation updates are built into the repo rules alongside deterministic pricing — whenever we ship something new, this Handbook updates right with it.',
        },
      },
    ],
  },
];

export const HANDBOOK_INDEX_TERMS: HandbookIndexEntry[] = [
  { term: 'AI Assistant (emit_scope)', chapterId: 'pricing-and-systems', sectionId: 'deterministic-rule', note: 'Extracts scope at temperature 0; never computes prices' },
  { term: 'AI Finish Visualizer', chapterId: 'finish-visualizer', sectionId: 'site-walk-capture', note: 'Site-walk photo to branded Before/After Concept Card' },
  { term: 'Before / After Slider', chapterId: 'finish-visualizer', sectionId: 'presenting-concepts', note: 'Interactive client presentation & PNG export' },
  { term: 'Biolime / Venetian / Tadelakt', chapterId: 'finish-visualizer', sectionId: 'site-walk-capture', note: 'Craftsmanship finish system presets in Visualizer' },
  { term: 'Brand Board (#1a2332)', chapterId: 'studio-overview', sectionId: 'brand-and-settings', note: 'Darkest Navy Blue across PDFs, cards, and UI' },
  { term: 'Bill-To vs. Middleman', chapterId: 'contacts-projects', sectionId: 'contacts-directory', note: 'Homeowner pays; Designer/Builder acts as specifier/middleman' },
  { term: 'Change Orders', chapterId: 'contacts-projects', sectionId: 'project-workspace', note: 'Track mid-job additions; merge into final Invoice' },
  { term: 'Contacts vs. Outreach Leads', chapterId: 'contacts-projects', sectionId: 'contacts-directory', note: 'Active clients live in /contacts; cold leads in /outreach' },
  { term: 'Copy To / Copy Subject', chapterId: 'outreach-hub', sectionId: 'gmail-handoff', note: '1-tap clipboard helpers in Outreach email modal' },
  { term: 'Deterministic Pricing (pricing.ts)', chapterId: 'pricing-and-systems', sectionId: 'deterministic-rule', note: 'Client-side labor + pass-through materials math' },
  { term: 'DNS MX Verification', chapterId: 'outreach-hub', sectionId: 'lead-scout-and-verifier', note: 'Live Google DNS MX checks in Verify Leads' },
  { term: 'Estimates → Invoices', chapterId: 'estimates-invoices', sectionId: 'converting-to-invoices', note: '1-click conversion from approved estimate to invoice' },
  { term: 'Gmail Handoff (Android / iOS / Web)', chapterId: 'outreach-hub', sectionId: 'gmail-handoff', note: 'Native mobile intents & desktop Gmail compose' },
  { term: 'Instagram Email Signature', chapterId: 'outreach-hub', sectionId: 'gmail-handoff', note: 'Organic Finishes logo & Instagram link in outreach emails' },
  { term: 'Lead Scout Playbooks', chapterId: 'outreach-hub', sectionId: 'lead-scout-and-verifier', note: 'Onboard AI lead discovery with dedupe & junk guard' },
  { term: 'Living Documentation Rule', chapterId: 'quick-reference', sectionId: 'living-handbook-rule', note: 'Handbook updates in the same PR as every feature' },
  { term: 'Minimums (2026–2027)', chapterId: 'pricing-and-systems', sectionId: 'catalog-structure', note: 'Synced job minimums in Settings & Price Book' },
  { term: 'Price Book (15 Services)', chapterId: 'pricing-and-systems', sectionId: 'catalog-structure', note: 'Flat per-SF and day-rate services in /services' },
  { term: 'Project Handoff (projectId)', chapterId: 'contacts-projects', sectionId: 'project-workspace', note: 'Created at site walk; auto-links project & client' },
  { term: 'PWA Instant Updates', chapterId: 'quick-reference', sectionId: 'field-troubleshooting', note: 'skipWaiting & clientsClaim service-worker refresh' },
  { term: 'Receipts & Job Costing', chapterId: 'receipts-tax', sectionId: 'capturing-receipts', note: 'Snap & categorize receipts linked to projects' },
  { term: 'Sample Board Presets', chapterId: 'finish-visualizer', sectionId: 'site-walk-capture', note: '4 real Organic Finishes boards built into Visualizer' },
  { term: 'Systems Library (16 Systems)', chapterId: 'pricing-and-systems', sectionId: 'catalog-structure', note: 'SureCrete, Meoded, Vasari & Mineral coverage/costs' },
  { term: 'Tax Summary (/reports/tax)', chapterId: 'receipts-tax', sectionId: 'tax-summary-report', note: 'Annual revenue vs. deductible expenses report' },
  { term: 'Travel Policy (1.5 hr Radius)', chapterId: 'studio-overview', sectionId: 'brand-and-settings', note: 'Sand Springs / Tulsa base; hotel + food beyond 1.5 hrs' },
];

export const HANDBOOK_CHANGELOG: HandbookChangelogEntry[] = [
  {
    date: '2026-11-27',
    version: 'v1.1',
    summary:
      'Codified Organic Finishes LLC operating rules: Sand Springs/Tulsa home base & 1.5-hour travel/hotel policy, Site-Walk Project creation, Bill-To Homeowner vs. Designer/Builder middleman, Commercial vs. Residential, and Change Orders merging into the final Invoice.',
    chaptersUpdated: ['01', '03', '06'],
  },
  {
    date: '2026-11-26',
    version: 'v1.0',
    summary:
      'Launched the in-app OF Studio Manager Handbook (/handbook) with 8 chapters, clean studio blueprint diagrams, instant full-text search, A–Z index, and the zero-drift AGENTS.md update rule.',
    chaptersUpdated: ['01', '02', '03', '04', '05', '06', '07', '08'],
  },
  {
    date: '2026-11-26',
    version: 'baseline',
    summary:
      'Documented Darkest Navy Blue (#1a2332) brand alignment, 12+ custom StudioIcons, projectId estimate handoff, Outreach Gmail + Instagram signature, AI Finish Visualizer, and 2026–2027 regional rate card.',
    chaptersUpdated: ['01', '02', '03', '04', '05', '06'],
  },
];
