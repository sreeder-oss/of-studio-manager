import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Compass,
  ExternalLink,
  History,
  Lightbulb,
  ListTree,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  DashboardIcon,
  EstimatesIcon,
  HandbookIcon,
  OutreachIcon,
  PriceBookIcon,
  ProjectsIcon,
  ReceiptsIcon,
  SettingsIcon,
  VisualizerIcon,
} from '@/components/icons/StudioIcons';
import { HandbookDiagram } from '@/components/handbook/HandbookDiagrams';
import {
  HANDBOOK_CHANGELOG,
  HANDBOOK_CHAPTERS,
  HANDBOOK_INDEX_TERMS,
  HANDBOOK_LAST_UPDATED,
  HANDBOOK_VERSION,
  type CalloutTone,
  type HandbookChapter,
  type HandbookIconKey,
} from '@/data/handbook';
import { cn } from '@/lib/utils';

type PanelTab = 'chapters' | 'index' | 'updates';

const ICON_MAP: Record<
  HandbookIconKey,
  React.ComponentType<{ size?: string | number; className?: string; strokeWidth?: string | number }>
> = {
  dashboard: DashboardIcon,
  outreach: OutreachIcon,
  projects: ProjectsIcon,
  visualizer: VisualizerIcon,
  pricebook: PriceBookIcon,
  estimates: EstimatesIcon,
  receipts: ReceiptsIcon,
  settings: SettingsIcon,
};

const CALLOUT_STYLES: Record<
  CalloutTone,
  { badge: string; border: string; bg: string; icon: React.ComponentType<{ size?: number; className?: string }> }
> = {
  rule: {
    badge: 'STUDIO RULE',
    border: 'border-primary/40',
    bg: 'bg-primary/10',
    icon: ShieldCheck,
  },
  tip: {
    badge: 'PRO TIP',
    border: 'border-[#d9a441]/40',
    bg: 'bg-[#d9a441]/10',
    icon: Lightbulb,
  },
  field: {
    badge: 'FIELD NOTE',
    border: 'border-border',
    bg: 'bg-accent/50',
    icon: Compass,
  },
};

function chapterMatchesQuery(chapter: HandbookChapter, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  if (
    chapter.title.toLowerCase().includes(needle) ||
    chapter.subtitle.toLowerCase().includes(needle) ||
    chapter.summary.toLowerCase().includes(needle) ||
    chapter.number.includes(needle) ||
    chapter.keywords.some((k) => k.toLowerCase().includes(needle))
  ) {
    return true;
  }
  return chapter.sections.some(
    (s) =>
      s.heading.toLowerCase().includes(needle) ||
      s.body.toLowerCase().includes(needle) ||
      s.steps?.some((st) => st.toLowerCase().includes(needle)) ||
      s.bullets?.some((b) => b.toLowerCase().includes(needle)) ||
      s.callout?.title.toLowerCase().includes(needle) ||
      s.callout?.body.toLowerCase().includes(needle)
  );
}

const Handbook: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const initialChapterId =
    searchParams.get('chapter') &&
    HANDBOOK_CHAPTERS.some((c) => c.id === searchParams.get('chapter'))
      ? (searchParams.get('chapter') as string)
      : HANDBOOK_CHAPTERS[0].id;

  const [activeChapterId, setActiveChapterId] = useState<string>(initialChapterId);
  const [panelTab, setPanelTab] = useState<PanelTab>('chapters');
  const [query, setQuery] = useState('');
  const [pendingSectionId, setPendingSectionId] = useState<string | null>(null);

  // Keyboard shortcut: "/" focuses search, "Escape" clears search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setQuery('');
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Scroll to a specific section when jumping from the A–Z Index
  useEffect(() => {
    if (!pendingSectionId) return;
    const timer = window.setTimeout(() => {
      const el = document.getElementById(`section-${pendingSectionId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      setPendingSectionId(null);
    }, 60);
    return () => window.clearTimeout(timer);
  }, [activeChapterId, pendingSectionId]);

  const trimmedQuery = query.trim();

  const matchingChapters = useMemo(
    () => HANDBOOK_CHAPTERS.filter((c) => chapterMatchesQuery(c, trimmedQuery)),
    [trimmedQuery]
  );

  const filteredIndexTerms = useMemo(() => {
    const sorted = [...HANDBOOK_INDEX_TERMS].sort((a, b) => a.term.localeCompare(b.term));
    if (!trimmedQuery) return sorted;
    const needle = trimmedQuery.toLowerCase();
    return sorted.filter(
      (item) =>
        item.term.toLowerCase().includes(needle) || item.note.toLowerCase().includes(needle)
    );
  }, [trimmedQuery]);

  const activeChapter = useMemo(() => {
    const found = HANDBOOK_CHAPTERS.find((c) => c.id === activeChapterId);
    return found || HANDBOOK_CHAPTERS[0];
  }, [activeChapterId]);

  const activeIndex = HANDBOOK_CHAPTERS.findIndex((c) => c.id === activeChapter.id);
  const prevChapter = activeIndex > 0 ? HANDBOOK_CHAPTERS[activeIndex - 1] : null;
  const nextChapter =
    activeIndex < HANDBOOK_CHAPTERS.length - 1 ? HANDBOOK_CHAPTERS[activeIndex + 1] : null;

  const selectChapter = (chapterId: string, sectionId?: string) => {
    setActiveChapterId(chapterId);
    setSearchParams({ chapter: chapterId }, { replace: true });
    if (sectionId) {
      setPendingSectionId(sectionId);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const ActiveIcon = ICON_MAP[activeChapter.iconKey];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ============================================================ */}
      {/* HERO HEADER + INSTANT SEARCH                                 */}
      {/* ============================================================ */}
      <section className="rounded-2xl border border-border bg-card/80 p-5 md:p-7 shadow-lg relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-[0.16em]">
                <HandbookIcon size={13} />
                Studio Handbook
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#d9a441]/15 text-[#d9a441] text-[10px] font-mono font-semibold">
                {HANDBOOK_VERSION}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Updated {HANDBOOK_LAST_UPDATED}
              </span>
            </div>
            <h1 className="font-serif text-2xl md:text-3xl text-foreground tracking-tight">
              OF Studio Manager Handbook
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground max-w-2xl">
              Your living field manual for Organic Finishes LLC — chapters, studio blueprint
              diagrams, and a searchable A–Z index that updates alongside every new feature.
            </p>
          </div>

          {/* Search Input */}
          <div className="w-full lg:w-96 shrink-0">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='Search chapters or index (e.g. "Gmail", "Biolime", "MX")...'
                className="w-full pl-10 pr-16 py-2.5 rounded-xl bg-background/90 border border-border text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
              {query ? (
                <button
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent"
                >
                  <X size={14} />
                </button>
              ) : (
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded border border-border bg-card text-[10px] font-mono text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2">
                  /
                </kbd>
              )}
            </div>
            {trimmedQuery && (
              <p className="mt-1.5 text-[11px] text-muted-foreground px-1">
                Found{' '}
                <span className="text-primary font-semibold">{matchingChapters.length}</span>{' '}
                {matchingChapters.length === 1 ? 'chapter' : 'chapters'} &{' '}
                <span className="text-[#d9a441] font-semibold">{filteredIndexTerms.length}</span>{' '}
                index {filteredIndexTerms.length === 1 ? 'entry' : 'entries'}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SEARCH RESULTS BANNER (when typing a query)                  */}
      {/* ============================================================ */}
      {trimmedQuery && (
        <section className="rounded-2xl border border-primary/30 bg-card/70 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
              Instant Search Results for &ldquo;{trimmedQuery}&rdquo;
            </p>
            <button
              onClick={() => setQuery('')}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Clear
            </button>
          </div>

          {matchingChapters.length === 0 && filteredIndexTerms.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No matching chapters or index entries found. Try searching for{' '}
              <button
                onClick={() => setQuery('Gmail')}
                className="text-[#d9a441] hover:underline font-medium"
              >
                Gmail
              </button>
              ,{' '}
              <button
                onClick={() => setQuery('Visualizer')}
                className="text-primary hover:underline font-medium"
              >
                Visualizer
              </button>
              , or{' '}
              <button
                onClick={() => setQuery('Pricing')}
                className="text-[#d9a441] hover:underline font-medium"
              >
                Pricing
              </button>
              .
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {matchingChapters.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => {
                    selectChapter(ch.id);
                    setPanelTab('chapters');
                  }}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-xl border text-left transition-all',
                    ch.id === activeChapter.id
                      ? 'border-primary/50 bg-primary/10'
                      : 'border-border bg-background/60 hover:border-primary/40 hover:bg-accent/50'
                  )}
                >
                  <span className="font-mono text-xs font-bold text-[#d9a441] mt-0.5">
                    {ch.number}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{ch.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{ch.subtitle}</p>
                  </div>
                </button>
              ))}
              {filteredIndexTerms.slice(0, 6).map((term) => (
                <button
                  key={`${term.chapterId}-${term.term}`}
                  onClick={() => selectChapter(term.chapterId, term.sectionId)}
                  className="flex items-start justify-between gap-2 p-3 rounded-xl border border-border/80 bg-background/50 hover:border-[#d9a441]/50 hover:bg-[#d9a441]/5 text-left transition-all"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#d9a441] truncate">{term.term}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">{term.note}</p>
                  </div>
                  <ArrowRight size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ============================================================ */}
      {/* MAIN 2-COLUMN HANDBOOK LAYOUT                                */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT RAIL: Chapters / A–Z Index / Updates */}
        <aside className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-6 space-y-3">
          {/* Mode Switcher */}
          <div className="grid grid-cols-3 p-1 rounded-xl bg-card border border-border">
            {[
              { id: 'chapters' as PanelTab, label: 'Chapters', icon: BookOpen },
              { id: 'index' as PanelTab, label: 'A–Z Index', icon: ListTree },
              { id: 'updates' as PanelTab, label: 'Updates', icon: History },
            ].map(({ id, label, icon: TabIcon }) => (
              <button
                key={id}
                onClick={() => setPanelTab(id)}
                className={cn(
                  'flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all',
                  panelTab === id
                    ? 'bg-primary/15 text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <TabIcon size={13} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* TAB 1: CHAPTER LIST */}
          {panelTab === 'chapters' && (
            <nav
              aria-label="Handbook chapters"
              className="rounded-2xl border border-border bg-card/70 p-2 space-y-1"
            >
              {HANDBOOK_CHAPTERS.map((ch) => {
                const Icon = ICON_MAP[ch.iconKey];
                const isActive = ch.id === activeChapter.id;
                const matches = chapterMatchesQuery(ch, trimmedQuery);
                const isGold = ch.tone === 'gold';

                return (
                  <button
                    key={ch.id}
                    onClick={() => selectChapter(ch.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all',
                      isActive
                        ? isGold
                          ? 'bg-[#d9a441]/15 text-[#d9a441] border border-[#d9a441]/30'
                          : 'bg-primary/15 text-primary border border-primary/30'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-transparent',
                      trimmedQuery && !matches && 'opacity-40'
                    )}
                  >
                    <Icon
                      size={17}
                      className={cn(
                        'shrink-0',
                        isActive
                          ? isGold
                            ? 'text-[#d9a441]'
                            : 'text-primary'
                          : isGold
                            ? 'text-[#d9a441]/70'
                            : 'text-primary/70'
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] opacity-75">CH {ch.number}</span>
                      </div>
                      <p
                        className={cn(
                          'text-xs font-semibold truncate',
                          isActive ? 'text-foreground' : ''
                        )}
                      >
                        {ch.title}
                      </p>
                    </div>
                  </button>
                );
              })}
            </nav>
          )}

          {/* TAB 2: SEARCHABLE A–Z INDEX */}
          {panelTab === 'index' && (
            <div className="rounded-2xl border border-border bg-card/70 p-3 max-h-[68vh] overflow-y-auto space-y-1.5">
              <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Searchable A–Z Index ({filteredIndexTerms.length})
              </p>
              {filteredIndexTerms.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2 py-4">
                  No index entries match &ldquo;{trimmedQuery}&rdquo;.
                </p>
              ) : (
                filteredIndexTerms.map((item) => {
                  const ch = HANDBOOK_CHAPTERS.find((c) => c.id === item.chapterId);
                  return (
                    <button
                      key={`${item.chapterId}-${item.term}`}
                      onClick={() => selectChapter(item.chapterId, item.sectionId)}
                      className="w-full text-left p-2.5 rounded-xl border border-transparent hover:border-border hover:bg-accent/50 transition-all group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                          {item.term}
                        </span>
                        {ch && (
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-background text-[#d9a441] shrink-0">
                            Ch {ch.number}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{item.note}</p>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: LIVING CHANGELOG */}
          {panelTab === 'updates' && (
            <div className="rounded-2xl border border-border bg-card/70 p-3.5 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Documentation Changelog
              </p>
              {HANDBOOK_CHANGELOG.map((entry, idx) => (
                <div
                  key={`${entry.date}-${idx}`}
                  className="p-3 rounded-xl bg-background/60 border border-border/70 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold text-[#d9a441]">
                      {entry.version}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {entry.date}
                    </span>
                  </div>
                  <p className="text-xs text-foreground/90 leading-relaxed">{entry.summary}</p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {entry.chaptersUpdated.map((num) => (
                      <span
                        key={num}
                        className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary"
                      >
                        Ch {num}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* RIGHT PANE: ACTIVE CHAPTER READER */}
        <article className="lg:col-span-8 xl:col-span-9 space-y-6">
          {/* Chapter Header Card */}
          <div className="rounded-2xl border border-border bg-card/80 p-5 md:p-7 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div
                  className={cn(
                    'h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border',
                    activeChapter.tone === 'gold'
                      ? 'bg-[#d9a441]/12 border-[#d9a441]/30 text-[#d9a441]'
                      : 'bg-primary/12 border-primary/30 text-primary'
                  )}
                >
                  <ActiveIcon size={22} />
                </div>
                <div className="space-y-1">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d9a441]">
                    Chapter {activeChapter.number} of {String(HANDBOOK_CHAPTERS.length).padStart(2, '0')}
                  </p>
                  <h2 className="font-serif text-2xl md:text-3xl text-foreground">
                    {activeChapter.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">{activeChapter.subtitle}</p>
                </div>
              </div>

              <button
                onClick={() => navigate(activeChapter.route)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity shrink-0 shadow-sm"
              >
                <span>{activeChapter.routeLabel}</span>
                <ExternalLink size={13} />
              </button>
            </div>

            <p className="text-sm text-foreground/90 leading-relaxed border-t border-border/60 pt-4">
              {activeChapter.summary}
            </p>

            {/* Quick Keyword Chips */}
            <div className="flex flex-wrap gap-1.5">
              {activeChapter.keywords.slice(0, 8).map((kw) => (
                <button
                  key={kw}
                  onClick={() => setQuery(kw)}
                  className="px-2.5 py-0.5 rounded-full bg-background/80 border border-border/70 text-[10px] font-mono text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                >
                  #{kw}
                </button>
              ))}
            </div>
          </div>

          {/* Visual Studio Blueprint Diagram */}
          <HandbookDiagram id={activeChapter.diagramId} />

          {/* Chapter Sections */}
          <div className="space-y-4">
            {activeChapter.sections.map((section, idx) => {
              const calloutStyle = section.callout ? CALLOUT_STYLES[section.callout.tone] : null;
              const CalloutIcon = calloutStyle?.icon;

              return (
                <section
                  key={section.id}
                  id={`section-${section.id}`}
                  className="rounded-2xl border border-border bg-card/70 p-5 md:p-6 space-y-4 scroll-mt-20"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-background border border-border text-[#d9a441]">
                      {activeChapter.number}.{idx + 1}
                    </span>
                    <h3 className="font-serif text-xl text-foreground">{section.heading}</h3>
                  </div>

                  <p className="text-sm text-foreground/85 leading-relaxed">{section.body}</p>

                  {section.steps && section.steps.length > 0 && (
                    <ol className="space-y-2.5 pt-1">
                      {section.steps.map((step, sIdx) => (
                        <li
                          key={sIdx}
                          className="flex items-start gap-3 p-3 rounded-xl bg-background/60 border border-border/60"
                        >
                          <span className="h-6 w-6 rounded-full bg-primary/15 text-primary font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {sIdx + 1}
                          </span>
                          <span className="text-sm text-foreground/90 leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ol>
                  )}

                  {section.bullets && section.bullets.length > 0 && (
                    <ul className="space-y-2 pt-1">
                      {section.bullets.map((bullet, bIdx) => (
                        <li
                          key={bIdx}
                          className="flex items-start gap-2.5 text-sm text-foreground/90 leading-relaxed"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-[#d9a441] shrink-0 mt-2" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {section.callout && calloutStyle && CalloutIcon && (
                    <div
                      className={cn(
                        'rounded-xl border p-4 flex items-start gap-3',
                        calloutStyle.border,
                        calloutStyle.bg
                      )}
                    >
                      <CalloutIcon
                        size={18}
                        className={cn(
                          'shrink-0 mt-0.5',
                          section.callout.tone === 'tip'
                            ? 'text-[#d9a441]'
                            : section.callout.tone === 'rule'
                              ? 'text-primary'
                              : 'text-foreground'
                        )}
                      />
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                          {calloutStyle.badge}
                        </p>
                        <p className="text-sm font-semibold text-foreground">
                          {section.callout.title}
                        </p>
                        <p className="text-xs text-foreground/85 leading-relaxed">
                          {section.callout.body}
                        </p>
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          {/* Prev / Next Chapter Footer */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            {prevChapter ? (
              <button
                onClick={() => selectChapter(prevChapter.id)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card/70 hover:bg-accent/60 hover:border-primary/40 transition-all text-left"
              >
                <ArrowLeft size={16} className="text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[10px] font-mono uppercase text-muted-foreground">
                    Previous · Ch {prevChapter.number}
                  </p>
                  <p className="text-sm font-semibold text-foreground">{prevChapter.title}</p>
                </div>
              </button>
            ) : (
              <div />
            )}

            {nextChapter && (
              <button
                onClick={() => selectChapter(nextChapter.id)}
                className="flex items-center justify-end gap-3 px-4 py-3 rounded-xl border border-border bg-card/70 hover:bg-accent/60 hover:border-primary/40 transition-all text-right"
              >
                <div>
                  <p className="text-[10px] font-mono uppercase text-muted-foreground">
                    Next · Ch {nextChapter.number}
                  </p>
                  <p className="text-sm font-semibold text-foreground">{nextChapter.title}</p>
                </div>
                <ArrowRight size={16} className="text-primary shrink-0" />
              </button>
            )}
          </div>
        </article>
      </div>
    </div>
  );
};

export default Handbook;
