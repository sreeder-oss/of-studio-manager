import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Users,
  FolderKanban,
  FileText,
  FileSpreadsheet,
  Receipt,
  Layers,
  Tag,
  LogOut,
  Settings as SettingsIcon,
  PieChart,
  Menu,
  X,
  ChevronRight,
  ExternalLink,
  Wand2,
} from 'lucide-react';
import LuminaIcon from '@/components/icons/LuminaIcon';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import logoSrc from '@/assets/of-letters.svg';
import { FloatingAIButton } from '@/components/ai/FloatingAIButton';
import { AIAssistant } from '@/components/ai/AIAssistant';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ size?: string | number; className?: string; strokeWidth?: string | number }>;
  badge?: string;
}

const coreNav: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: LuminaIcon },
  { path: '/estimates', label: 'Estimates', icon: FileText },
  { path: '/invoices', label: 'Invoices', icon: FileSpreadsheet },
  { path: '/projects', label: 'Projects', icon: FolderKanban },
  { path: '/receipts', label: 'Receipts', icon: Receipt },
  { path: '/reports/tax', label: 'Tax Summary', icon: PieChart },
];

const studioNav: NavItem[] = [
  { path: '/contacts', label: 'Contacts', icon: Users },
  { path: '/visualizer', label: 'Finish Visualizer', icon: Wand2 },
  { path: '/services', label: 'Price Book', icon: Tag },
  { path: '/systems', label: 'Systems Library', icon: Layers },
  { path: '/settings', label: 'Settings', icon: SettingsIcon },
];

// Mobile primary bar items
const mobilePrimaryNav = [
  { path: '/', label: 'Home', icon: LuminaIcon },
  { path: '/estimates', label: 'Estimates', icon: FileText },
  { path: '/invoices', label: 'Invoices', icon: FileSpreadsheet },
  { path: '/contacts', label: 'Contacts', icon: Users },
];

const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isNavActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* ============================================================ */}
      {/* DESKTOP / LAPTOP SIDEBAR (md:flex)                           */}
      {/* ============================================================ */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card/60 backdrop-blur-xl h-screen sticky top-0 shrink-0 z-30 select-none">
        {/* Brand Header */}
        <div className="p-5 border-b border-border/70 flex items-center gap-3">
          <img src={logoSrc} alt="OF" className="h-9 w-auto" />
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-foreground text-sm font-bold tracking-wide leading-none">
              OF STUDIO
            </h1>
            <p className="text-[9px] text-primary uppercase tracking-[0.2em] font-semibold mt-0.5">
              Organic Finishes
            </p>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
          {/* Operations Section */}
          <div className="space-y-1">
            <p className="px-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/80 mb-2">
              Operations
            </p>
            {coreNav.map(({ path, label, icon: Icon }) => {
              const active = isNavActive(path);
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group text-left',
                    active
                      ? 'bg-primary/10 text-primary font-semibold shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                  )}
                >
                  <Icon
                    size={17}
                    className={cn(
                      'shrink-0 transition-colors',
                      active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                    )}
                    strokeWidth={active ? 2.5 : 1.75}
                  />
                  <span className="flex-1 truncate">{label}</span>
                  {active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 shadow-glow" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Studio & Settings Section */}
          <div className="space-y-1">
            <p className="px-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/80 mb-2">
              Catalog & Studio
            </p>
            {studioNav.map(({ path, label, icon: Icon }) => {
              const active = isNavActive(path);
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group text-left',
                    active
                      ? 'bg-primary/10 text-primary font-semibold shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                  )}
                >
                  <Icon
                    size={17}
                    className={cn(
                      'shrink-0 transition-colors',
                      active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                    )}
                    strokeWidth={active ? 2.5 : 1.75}
                  />
                  <span className="flex-1 truncate">{label}</span>
                  {active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 shadow-glow" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* User Profile Card at Bottom of Sidebar */}
        <div className="p-3 border-t border-border/70 bg-card/40">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-accent/40 border border-border/50">
            {user?.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt=""
                className="h-8 w-8 rounded-full border border-border shrink-0 object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                SR
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">
                {user?.user_metadata?.full_name || 'Shawn Reeder'}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {user?.email || 'Organic Finishes'}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign Out"
              aria-label="Sign Out"
              className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors shrink-0"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* MAIN VIEWPORT                                                */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Mobile Top Header (< md) */}
        <header className="md:hidden px-4 pt-3 pb-2.5 flex items-center justify-between border-b border-border/60 bg-card/80 backdrop-blur-lg sticky top-0 z-20">
          <div className="flex items-center gap-2.5" onClick={() => navigate('/')}>
            <img src={logoSrc} alt="OF" className="h-7 w-auto" />
            <div>
              <h1 className="font-serif text-foreground text-xs font-bold tracking-wide leading-none">
                OF STUDIO
              </h1>
              <p className="text-[8px] text-primary uppercase tracking-[0.2em] font-semibold">
                manager
              </p>
            </div>
          </div>
          {user && (
            <div className="flex items-center gap-2">
              {user.user_metadata?.avatar_url && (
                <img
                  src={user.user_metadata.avatar_url}
                  alt=""
                  className="h-6 w-6 rounded-full border border-border"
                />
              )}
              <button
                onClick={handleSignOut}
                aria-label="Sign out"
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <LogOut size={15} />
              </button>
            </div>
          )}
        </header>

        {/* Content Viewport */}
        <main className="flex-1 p-4 md:p-8 lg:p-10 pb-24 md:pb-10 overflow-y-auto no-scrollbar">
          <Outlet />
        </main>

        {/* ============================================================ */}
        {/* MOBILE BOTTOM NAVIGATION BAR (< md)                          */}
        {/* ============================================================ */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border z-40">
          <div className="flex justify-around items-center py-2 px-1 max-w-md mx-auto">
            {mobilePrimaryNav.map(({ path, label, icon: Icon }) => {
              const active = isNavActive(path);
              return (
                <button
                  key={path}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate(path);
                  }}
                  className={cn(
                    'flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all',
                    active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon size={19} strokeWidth={active ? 2.5 : 1.75} />
                  <span className="text-[8px] font-semibold uppercase tracking-wider">{label}</span>
                </button>
              );
            })}

            {/* "More" toggle for mobile */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all',
                mobileMenuOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
              <span className="text-[8px] font-semibold uppercase tracking-wider">More</span>
            </button>
          </div>
        </nav>

        {/* Mobile "More" Drawer Overlay */}
        {mobileMenuOpen && (
          <div
            className="md:hidden fixed inset-0 bg-background/80 backdrop-blur-md z-30 pb-20 pt-16 px-4 animate-fade-in flex flex-col justify-end"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div
              className="bg-card border border-border rounded-2xl p-4 shadow-2xl space-y-3 mb-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-border/70 pb-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Studio Navigation
                </p>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-muted-foreground p-1"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { path: '/visualizer', label: 'Finish Visualizer', icon: Wand2 },
                  { path: '/receipts', label: 'Receipts', icon: Receipt },
                  { path: '/projects', label: 'Projects', icon: FolderKanban },
                  { path: '/reports/tax', label: 'Tax Summary', icon: PieChart },
                  { path: '/services', label: 'Price Book', icon: Tag },
                  { path: '/systems', label: 'Systems Library', icon: Layers },
                  { path: '/settings', label: 'Settings', icon: SettingsIcon },
                ].map(({ path, label, icon: Icon }) => (
                  <button
                    key={path}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate(path);
                    }}
                    className={cn(
                      'flex items-center gap-2 p-2.5 rounded-xl border border-border bg-accent/30 text-left transition-colors',
                      isNavActive(path) ? 'border-primary/40 text-primary font-bold' : 'text-foreground'
                    )}
                  >
                    <Icon size={16} className="text-primary shrink-0" />
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <FloatingAIButton />
        <AIAssistant />
      </div>
    </div>
  );
};

export default React.memo(AppLayout);
