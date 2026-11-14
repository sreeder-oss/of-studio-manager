import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Filter, Download } from 'lucide-react';
import { useReceipts } from '@/hooks/useReceipts';
import { useProjects } from '@/hooks/useProjects';
import { useAuthReady } from '@/hooks/useAuthReady';
import { supabase } from '@/integrations/supabase/client';
import { todayLocal } from '@/lib/utils';
import { toCsv, downloadCsv } from '@/lib/csv';
import { toast } from 'sonner';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const money = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type IncomeRow = {
  id: string; amount: number; paid_on: string; method: string | null; reference: string | null;
  invoices: { invoice_number: string | null; contacts: { name: string } | null } | null;
};

const receiptYear = (r: { tax_year: string | null; receipt_date: string }) => r.tax_year || String(r.receipt_date).slice(0, 4);

const TaxSummary: React.FC = () => {
  const navigate = useNavigate();
  const { user, isReady } = useAuthReady();
  const { data: receipts = [] } = useReceipts();
  const { data: projects = [] } = useProjects();
  const [deductibleOnly, setDeductibleOnly] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const yearParam = searchParams.get('year');
  const year = yearParam && /^\d{4}$/.test(yearParam) ? yearParam : todayLocal().slice(0, 4);
  const setYear = (y: string) => setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('year', y); return n; }, { replace: true });

  const { data: income = [] } = useQuery({
    queryKey: ['invoice_payments', 'year', user?.id, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice_payments')
        .select('id, amount, paid_on, method, reference, invoices(invoice_number, contacts(name))')
        .gte('paid_on', `${year}-01-01`).lte('paid_on', `${year}-12-31`)
        .order('paid_on', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as IncomeRow[];
    },
    enabled: isReady && !!user,
  });

  const yearOptions = useMemo(() => {
    const set = new Set<string>([todayLocal().slice(0, 4), year]);
    receipts.forEach(r => set.add(receiptYear(r)));
    return Array.from(set).sort().reverse();
  }, [receipts, year]);

  const yearReceipts = useMemo(() => receipts.filter(r => receiptYear(r) === year), [receipts, year]);
  const filtered = useMemo(() => deductibleOnly ? yearReceipts.filter(r => r.tax_deductible) : yearReceipts, [yearReceipts, deductibleOnly]);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(r => { const c = r.category || 'Uncategorized'; map[c] = (map[c] || 0) + Number(r.amount); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const incomeByMonth = useMemo(() => {
    const m = new Array(12).fill(0) as number[];
    income.forEach(p => { const i = Number(p.paid_on.slice(5, 7)) - 1; if (i >= 0 && i < 12) m[i] += Number(p.amount); });
    return m;
  }, [income]);

  const totalIncome = incomeByMonth.reduce((s, n) => s + n, 0);
  const totalDeductible = filtered.filter(r => r.tax_deductible).reduce((s, r) => s + Number(r.amount), 0);
  const grandTotal = filtered.reduce((s, r) => s + Number(r.amount), 0);

  const projectName = (id: string | null) => (id ? projects.find(p => p.id === id)?.name ?? '' : '');

  const exportCsv = () => {
    const expenses = [...yearReceipts].sort((a, b) => a.receipt_date.localeCompare(b.receipt_date));
    downloadCsv(toCsv(
      ['date', 'vendor', 'category', 'amount', 'deductible', 'project', 'notes'],
      expenses.map(r => [r.receipt_date, r.vendor, r.category, Number(r.amount).toFixed(2), r.tax_deductible ? 'yes' : 'no', projectName(r.project_id), r.notes]),
    ), `expenses-${year}.csv`);
    setTimeout(() => downloadCsv(toCsv(
      ['date', 'client', 'invoice number', 'method', 'reference', 'amount'],
      income.map(p => [p.paid_on, p.invoices?.contacts?.name ?? '', p.invoices?.invoice_number ?? '', p.method, p.reference, Number(p.amount).toFixed(2)]),
    ), `income-${year}.csv`), 400);
    toast.success(`Exported ${expenses.length} expenses and ${income.length} payments for ${year}`);
  };

  return (
    <div className="space-y-4 animate-fade-in pb-20 max-w-2xl mx-auto">
      <button onClick={() => navigate('/')} className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-[10px] font-bold uppercase tracking-widest">
        <ChevronLeft size={14} /> Dashboard
      </button>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="font-serif text-foreground text-xl">Tax Summary</h2>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mt-0.5">
            {filtered.length} receipt{filtered.length !== 1 ? 's' : ''} · {income.length} payment{income.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select aria-label="Tax year" value={year} onChange={e => setYear(e.target.value)}
            className="bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-foreground outline-none">
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={exportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest bg-primary text-primary-foreground">
            <Download size={12} /> Export CSV
          </button>
        </div>
      </div>

      {/* Income */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Income received · {year}</p>
          <p className="font-serif text-primary font-bold">{money(totalIncome)}</p>
        </div>
        {totalIncome === 0 ? (
          <p className="text-muted-foreground text-[11px] text-center py-6">No payments recorded in {year}.</p>
        ) : MONTHS.map((m, i) => incomeByMonth[i] > 0 && (
          <div key={m} className="flex items-center justify-between px-3 py-2 border-b border-border last:border-b-0">
            <p className="text-foreground text-sm">{m}</p>
            <p className="font-serif text-foreground font-bold">{money(incomeByMonth[i])}</p>
          </div>
        ))}
      </div>

      {/* Expenses */}
      <div className="flex items-center justify-between">
        <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Expenses · {year}</p>
        <button
          onClick={() => setDeductibleOnly(!deductibleOnly)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border transition-all ${
            deductibleOnly ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:text-foreground'
          }`}
        >
          <Filter size={12} /> {deductibleOnly ? 'Deductible Only' : 'All Receipts'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card p-4 rounded-xl border border-border">
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Total Expenses</p>
          <p className="font-serif text-foreground text-xl mt-1">{money(grandTotal)}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border">
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Total Deductible</p>
          <p className="font-serif text-primary text-xl mt-1">{money(totalDeductible)}</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-3 border-b border-border">
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">By Category</p>
        </div>
        {byCategory.length === 0 ? (
          <p className="text-muted-foreground text-[11px] text-center py-6">No receipts in {year}.</p>
        ) : byCategory.map(([cat, total]) => {
          const pct = grandTotal > 0 ? (total / grandTotal) * 100 : 0;
          return (
            <div key={cat} className="px-3 py-2.5 border-b border-border last:border-b-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-foreground text-sm font-semibold">{cat}</p>
                <p className="font-serif text-foreground font-bold">{money(total)}</p>
              </div>
              <div className="h-1.5 bg-accent rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TaxSummary;
