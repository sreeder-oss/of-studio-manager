import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, FileText, CheckCircle, Clock, Send } from 'lucide-react';
import { useEstimates } from '@/hooks/useEstimates';
import { useContacts } from '@/hooks/useContacts';

const Estimates: React.FC = () => {
  const navigate = useNavigate();
  const { data: contacts = [] } = useContacts();
  const { data: estimates = [], isLoading } = useEstimates();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEstimates = estimates.filter(e => {
    const contact = contacts.find(c => c.id === e.contact_id);
    return (contact?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getStatusInfo = (status: string | null) => {
    if (status === 'Approved') return { label: 'Approved', classes: 'bg-primary/10 text-primary border-primary/20', icon: <CheckCircle size={10} className="mr-1" /> };
    if (status === 'Invoiced') return { label: 'Invoiced', classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: <Send size={10} className="mr-1" /> };
    return { label: 'Pending', classes: 'bg-warning/10 text-warning border-warning/20', icon: <Clock size={10} className="mr-1" /> };
  };

  if (isLoading) return <div className="text-center py-20 text-muted-foreground text-sm">Loading estimates...</div>;

  return (
    <div className="space-y-4 animate-fade-in max-w-5xl mx-auto">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-serif text-foreground tracking-tight">Estimates</h2>
          <p className="text-muted-foreground text-[9px] uppercase tracking-widest mt-0.5 font-bold">Project Proposals</p>
        </div>
        <button onClick={() => navigate('/estimates/new')} className="bg-primary text-primary-foreground px-5 py-2 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-glow">
          New Quote
        </button>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <input type="text" placeholder="Search estimates..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-card border border-border rounded-xl py-2.5 pl-12 pr-4 text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground text-[12px]" />
      </div>

      <div className="space-y-3">
        {filteredEstimates.length === 0 ? (
          <div className="text-center py-10 bg-card rounded-xl border border-dashed border-border">
            <p className="text-muted-foreground text-[11px]">No estimates yet. Tap "New Quote" to create one.</p>
          </div>
        ) : (
          filteredEstimates.map(e => {
            const status = getStatusInfo(e.status);
            const contact = contacts.find(c => c.id === e.contact_id);
            return (
              <div key={e.id} onClick={() => navigate(`/estimates/${e.id}`)}
                className="bg-card p-4 rounded-xl border border-border flex justify-between items-center hover:border-primary/20 transition-all cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors border border-border">
                    <FileText size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">{contact?.name || 'Unknown'}</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{e.created_at ? new Date(e.created_at).toLocaleDateString() : ''}</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-serif text-foreground text-sm">${Number(e.total || 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                    <span className={`text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-widest border flex items-center ${status.classes}`}>
                      {status.icon} {status.label}
                    </span>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Estimates;
