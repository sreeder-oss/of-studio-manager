import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  FolderKanban,
  FileText,
  FileSpreadsheet,
  Receipt,
  PieChart,
  ArrowRight,
  Plus,
  Camera,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useInvoices, type DbInvoice } from '@/hooks/useInvoices';
import { useEstimates } from '@/hooks/useEstimates';
import { useProjects } from '@/hooks/useProjects';
import { useReceipts } from '@/hooks/useReceipts';
import { useContacts } from '@/hooks/useContacts';
import { useAuthReady } from '@/hooks/useAuthReady';
import { supabase } from '@/integrations/supabase/client';
import { todayLocal } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const fmt = (n: number) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtShort = (n: number) => `$${Math.round(Number(n || 0)).toLocaleString()}`;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, isReady } = useAuthReady();

  const { data: invoices = [], isLoading: loadingInvoices } = useInvoices();
  const { data: estimates = [], isLoading: loadingEstimates } = useEstimates();
  const { data: projects = [], isLoading: loadingProjects } = useProjects();
  const { data: receipts = [], isLoading: loadingReceipts } = useReceipts();
  const { data: contacts = [] } = useContacts();

  const currentYear = todayLocal().slice(0, 4);

  // YTD Collected Payments from the invoice_payments ledger
  const { data: ytdPayments = [] } = useQuery({
    queryKey: ['invoice_payments', 'ytd', user?.id, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice_payments')
        .select('amount, paid_on')
        .gte('paid_on', `${currentYear}-01-01`)
        .lte('paid_on', `${currentYear}-12-31`);
      if (error) throw error;
      return (data ?? []) as { amount: number | null; paid_on: string | null }[];
    },
    enabled: isReady && !!user,
  });

  // Calculate invoice balance remaining
  const invoiceBalance = (inv: DbInvoice) => {
    const tot = Number(inv.total || 0);
    const dep = Number(inv.deposit_applied || 0);
    const paid = Number(inv.amount_paid || 0);
    return Math.max(0, Math.round((tot - dep - paid) * 100) / 100);
  };

  // Metrics
  const unpaidInvoices = useMemo(
    () => invoices.filter((i) => !i.paid && i.status !== 'paid' && invoiceBalance(i) > 0),
    [invoices]
  );
  const totalUnpaidBalance = useMemo(
    () => unpaidInvoices.reduce((s, i) => s + invoiceBalance(i), 0),
    [unpaidInvoices]
  );

  const openEstimates = useMemo(
    () => estimates.filter((e) => e.status !== 'Invoiced' && e.status !== 'Declined'),
    [estimates]
  );
  const totalPipeline = useMemo(
    () => openEstimates.reduce((s, e) => s + Number(e.total || 0), 0),
    [openEstimates]
  );

  const activeProjects = useMemo(() => projects.filter((p) => p.status === 'Active'), [projects]);
  const biddingProjects = useMemo(() => projects.filter((p) => p.status === 'Bidding'), [projects]);
  const activeContractVolume = useMemo(
    () => activeProjects.reduce((s, p) => s + Number(p.contract_value || 0), 0),
    [activeProjects]
  );

  const yearReceipts = useMemo(
    () => receipts.filter((r) => (r.tax_year || String(r.receipt_date || '').slice(0, 4)) === currentYear),
    [receipts, currentYear]
  );
  const ytdDeductibleExpenses = useMemo(
    () => yearReceipts.filter((r) => r.tax_deductible).reduce((s, r) => s + Number(r.amount || 0), 0),
    [yearReceipts]
  );
  const ytdIncome = useMemo(
    () => ytdPayments.reduce((s, p) => s + Number(p.amount || 0), 0),
    [ytdPayments]
  );
  const ytdNet = ytdIncome - ytdDeductibleExpenses;

  const contactMap = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);

  const navCards = [
    {
      title: 'Invoices',
      countLabel: unpaidInvoices.length > 0 ? `${unpaidInvoices.length} unpaid` : `${invoices.length} total`,
      amountLabel: unpaidInvoices.length > 0 ? fmt(totalUnpaidBalance) : 'All paid',
      description: 'Track receivables, recorded deposits & ledger payments.',
      icon: FileSpreadsheet,
      path: '/invoices',
      color: 'from-amber-500/20',
      badgeColor: unpaidInvoices.length > 0 ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' : 'bg-primary/10 text-primary border-primary/30',
    },
    {
      title: 'Estimates',
      countLabel: `${openEstimates.length} active`,
      amountLabel: fmt(totalPipeline),
      description: 'Price book proposals, Marmorino, microcement & limewash bids.',
      icon: FileText,
      path: '/estimates',
      color: 'from-emerald-500/20',
      badgeColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
    },
    {
      title: 'Projects',
      countLabel: `${activeProjects.length} in progress`,
      amountLabel: `${biddingProjects.length} bidding`,
      description: 'Track commercial jobs, change orders, documents & photos.',
      icon: FolderKanban,
      path: '/projects',
      color: 'from-violet-500/20',
      badgeColor: 'bg-violet-500/10 text-violet-500 border-violet-500/30',
    },
    {
      title: 'Receipts',
      countLabel: `${yearReceipts.length} in ${currentYear}`,
      amountLabel: fmt(ytdDeductibleExpenses),
      description: 'Camera capture & OCR expense tracking by category.',
      icon: Receipt,
      path: '/receipts',
      color: 'from-blue-500/20',
      badgeColor: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    },
    {
      title: 'Contacts',
      countLabel: `${contacts.length} total`,
      amountLabel: 'Clients & GCs',
      description: 'General contractors, commercial managers & client directories.',
      icon: Users,
      path: '/contacts',
      color: 'from-primary/20',
      badgeColor: 'bg-primary/10 text-primary border-primary/30',
    },
    {
      title: 'Tax Summary',
      countLabel: `${currentYear} Schedule C`,
      amountLabel: ytdNet >= 0 ? `+${fmt(ytdNet)}` : fmt(ytdNet),
      description: 'Annual revenue vs. deductible expenses with CSV export.',
      icon: PieChart,
      path: '/reports/tax',
      color: 'from-rose-500/20',
      badgeColor: 'bg-rose-500/10 text-rose-500 border-rose-500/30',
    },
  ];

  return (
    <div className="animate-fade-in max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header & Quick Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif text-foreground tracking-tight">Studio Dashboard</h2>
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-semibold mt-0.5">
            Organic Finishes LLC • Live Financial Snapshot
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate('/estimates/new')}
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-3.5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-glow hover:opacity-90 transition-opacity"
          >
            <Plus size={14} /> New Estimate
          </button>
          <button
            onClick={() => navigate('/receipts')}
            className="inline-flex items-center gap-1.5 bg-accent border border-border hover:border-primary/40 text-foreground px-3.5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors"
          >
            <Camera size={14} className="text-primary" /> Scan Receipt
          </button>
        </div>
      </div>

      {/* 4 Main Numbers / KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Unpaid Invoices */}
        <button
          onClick={() => navigate('/invoices')}
          className="bg-card border border-border hover:border-amber-500/40 rounded-xl p-4 text-left transition-all hover:-translate-y-0.5 shadow-soft flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Unpaid Invoices</span>
            <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
              <DollarSign size={14} />
            </div>
          </div>
          <div>
            <p className="font-serif text-xl sm:text-2xl text-foreground font-semibold">
              {loadingInvoices ? '—' : fmt(totalUnpaidBalance)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${unpaidInvoices.length > 0 ? 'bg-amber-500' : 'bg-primary'}`} />
              {unpaidInvoices.length} awaiting payment
            </p>
          </div>
        </button>

        {/* Pipeline Estimates */}
        <button
          onClick={() => navigate('/estimates')}
          className="bg-card border border-border hover:border-emerald-500/40 rounded-xl p-4 text-left transition-all hover:-translate-y-0.5 shadow-soft flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Active Pipeline</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <FileText size={14} />
            </div>
          </div>
          <div>
            <p className="font-serif text-xl sm:text-2xl text-foreground font-semibold">
              {loadingEstimates ? '—' : fmt(totalPipeline)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {openEstimates.length} active estimate{openEstimates.length === 1 ? '' : 's'}
            </p>
          </div>
        </button>

        {/* Active Projects */}
        <button
          onClick={() => navigate('/projects')}
          className="bg-card border border-border hover:border-violet-500/40 rounded-xl p-4 text-left transition-all hover:-translate-y-0.5 shadow-soft flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Active Jobs</span>
            <div className="h-7 w-7 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-500">
              <FolderKanban size={14} />
            </div>
          </div>
          <div>
            <p className="font-serif text-xl sm:text-2xl text-foreground font-semibold">
              {loadingProjects ? '—' : `${activeProjects.length} Active`}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
              {activeContractVolume > 0 ? `${fmtShort(activeContractVolume)} contract volume` : `${biddingProjects.length} bidding`}
            </p>
          </div>
        </button>

        {/* YTD Net Cashflow */}
        <button
          onClick={() => navigate('/reports/tax')}
          className="bg-card border border-border hover:border-primary/40 rounded-xl p-4 text-left transition-all hover:-translate-y-0.5 shadow-soft flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{currentYear} YTD Net</span>
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <TrendingUp size={14} />
            </div>
          </div>
          <div>
            <p className={`font-serif text-xl sm:text-2xl font-semibold ${ytdNet >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {ytdNet >= 0 ? `+${fmt(ytdNet)}` : fmt(ytdNet)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1 truncate">
              +{fmtShort(ytdIncome)} in / -{fmtShort(ytdDeductibleExpenses)} out
            </p>
          </div>
        </button>
      </div>

      {/* Actionable Alert: Outstanding Invoices requiring payment */}
      {unpaidInvoices.length > 0 && (
        <div className="bg-card border border-amber-500/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className="text-amber-500" />
              <p className="text-xs font-bold uppercase tracking-widest text-foreground">
                Invoices Awaiting Payment ({unpaidInvoices.length})
              </p>
            </div>
            <button
              onClick={() => navigate('/invoices')}
              className="text-[10px] text-primary hover:underline font-bold uppercase tracking-wider inline-flex items-center gap-1"
            >
              View all <ChevronRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-border/60">
            {unpaidInvoices.slice(0, 3).map((inv) => {
              const balance = invoiceBalance(inv);
              const contact = inv.contact_id ? contactMap.get(inv.contact_id) : null;
              return (
                <div
                  key={inv.id}
                  onClick={() => navigate(`/invoices/${inv.id}`)}
                  className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-accent/40 rounded-lg px-2 transition-colors -mx-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {contact?.name || 'Client'} • {inv.invoice_number || 'INV'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {inv.due_date ? `Due ${inv.due_date}` : 'Net 30'} • Status: {inv.status || 'Sent'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-bold text-amber-500">{fmt(balance)}</p>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Balance Due</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Studio Modules Grid with Live Badges */}
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-3">Studio Modules</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {navCards.map(({ title, countLabel, amountLabel, description, icon: Icon, path, color, badgeColor }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="group relative overflow-hidden bg-card border border-border rounded-xl p-4 text-left transition-all duration-300 hover:border-primary/40 hover:-translate-y-0.5 shadow-soft flex flex-col justify-between"
            >
              <div
                className={`absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br ${color} to-transparent blur-2xl opacity-40 group-hover:opacity-70 transition-opacity duration-500`}
              />

              <div className="relative z-10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="h-9 w-9 rounded-xl bg-accent flex items-center justify-center text-primary group-hover:scale-105 group-hover:shadow-glow transition-all duration-300">
                    <Icon size={18} />
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeColor}`}>
                    {countLabel}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-serif text-foreground tracking-wide">{title}</h3>
                  <p className="font-mono text-xs text-foreground font-semibold mt-0.5">{amountLabel}</p>
                  <p className="text-muted-foreground text-[11px] mt-1 leading-tight">{description}</p>
                </div>
              </div>

              <div className="relative z-10 pt-3 mt-3 border-t border-border/50 flex items-center text-primary text-[10px] font-bold tracking-widest uppercase group-hover:translate-x-1 transition-transform duration-300">
                <span>Open module</span>
                <ArrowRight size={12} className="ml-1.5" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
