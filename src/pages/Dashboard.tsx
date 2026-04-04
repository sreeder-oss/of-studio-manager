import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, FolderKanban, FileText, FileSpreadsheet, Receipt, ArrowRight } from 'lucide-react';

const navCards = [
  { title: 'Contacts', description: 'Manage client relationships and directories.', icon: Users, path: '/contacts', color: 'from-primary/20' },
  { title: 'Projects', description: 'Track jobs, documents, and photos.', icon: FolderKanban, path: '/projects', color: 'from-violet-500/20' },
  { title: 'Estimates', description: 'Draft high-end project proposals.', icon: FileText, path: '/estimates', color: 'from-emerald-500/20' },
  { title: 'Invoices', description: 'Track balances and project payments.', icon: FileSpreadsheet, path: '/invoices', color: 'from-teal-500/20' },
  { title: 'Receipts', description: 'Scan & organize expense receipts.', icon: Receipt, path: '/receipts', color: 'from-amber-500/20' },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="animate-fade-in max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-serif text-foreground tracking-tight">Dashboard</h2>
        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-semibold mt-1">OF Studio : Manager</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {navCards.map(({ title, description, icon: Icon, path, color }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="group relative overflow-hidden bg-card border border-border rounded-xl p-5 text-left transition-all duration-300 hover:border-primary/30 hover:-translate-y-1 shadow-soft"
          >
            <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full bg-gradient-to-br ${color} to-transparent blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-500`} />

            <div className="relative z-10 flex flex-col h-full">
              <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center text-primary mb-4 group-hover:scale-105 group-hover:shadow-glow transition-all duration-300">
                <Icon size={20} />
              </div>
              <h3 className="text-lg font-serif text-foreground mb-1 tracking-wide">{title}</h3>
              <p className="text-muted-foreground text-[11px] mb-6 leading-tight font-medium">{description}</p>
              <div className="mt-auto flex items-center text-primary text-[10px] font-bold tracking-widest uppercase group-hover:translate-x-1 transition-transform duration-300">
                <span>Explore</span>
                <ArrowRight size={12} className="ml-1.5" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
