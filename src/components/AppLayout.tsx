import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, FileSpreadsheet, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import monogramSrc from '@/assets/of-monogram.svg';

const navItems = [
  { path: '/', label: 'Home', icon: LayoutDashboard },
  { path: '/contacts', label: 'Contacts', icon: Users },
  { path: '/estimates', label: 'Estimates', icon: FileText },
  { path: '/invoices', label: 'Invoices', icon: FileSpreadsheet },
  { path: '/receipts', label: 'Receipts', icon: Receipt },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-4 pt-4 pb-2 flex items-center gap-3">
        <img src={monogramSrc} alt="OF" className="h-9 w-9 rounded-full" />
        <div>
          <h1 className="font-serif text-foreground text-sm tracking-wide leading-none">ORGANIC FINISHES</h1>
          <p className="text-[8px] text-muted-foreground uppercase tracking-[0.2em] font-medium">manager</p>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-24 no-scrollbar">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border z-50">
        <div className="flex justify-around items-center py-2 px-2 max-w-lg mx-auto">
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                <span className="text-[9px] font-semibold uppercase tracking-wider">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default AppLayout;
