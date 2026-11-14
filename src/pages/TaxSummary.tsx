import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Filter } from 'lucide-react';
import { useReceipts } from '@/hooks/useReceipts';

const TaxSummary: React.FC = () => {
  const navigate = useNavigate();
  const { data: receipts = [] } = useReceipts();
  const [deductibleOnly, setDeductibleOnly] = useState(false);
  const [searchParams] = useSearchParams();
  const yearParam = searchParams.get('year');
  const year = yearParam && /^\d{4}$/.test(yearParam) ? yearParam : null;

  const filtered = useMemo(() => {
    let list = receipts;
    if (year) list = list.filter(r => (r.tax_year || String(r.receipt_date).slice(0, 4)) === year);
    if (deductibleOnly) list = list.filter(r => r.tax_deductible);
    return list;
  }, [receipts, deductibleOnly, year]);

  const taxYears = useMemo(() => {
    const years = new Set(filtered.map(r => r.tax_year || String(r.receipt_date).slice(0, 4)));
    return Array.from(years).sort().reverse();
  }, [filtered]);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(r => {
      const cat = r.category || 'Uncategorized';
      map[cat] = (map[cat] || 0) + Number(r.amount);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const byYear = useMemo(() => {
    const map: Record<string, { total: number; deductible: number; count: number }> = {};
    filtered.forEach(r => {
      const year = r.tax_year || String(r.receipt_date).slice(0, 4);
      if (!map[year]) map[year] = { total: 0, deductible: 0, count: 0 };
      map[year].total += Number(r.amount);
      map[year].count += 1;
      if (r.tax_deductible) map[year].deductible += Number(r.amount);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const totalDeductible = useMemo(() =>
    filtered.filter(r => r.tax_deductible).reduce((s, r) => s + Number(r.amount), 0),
  [filtered]);

  const grandTotal = useMemo(() =>
    filtered.reduce((s, r) => s + Number(r.amount), 0),
  [filtered]);

  return (
    <div className="space-y-4 animate-fade-in pb-20 max-w-2xl mx-auto">
      <button onClick={() => navigate('/')} className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-[10px] font-bold uppercase tracking-widest">
        <ChevronLeft size={14} /> Dashboard
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-foreground text-xl">Tax Summary{year ? ` · ${year}` : ''}</h2>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mt-0.5">
            {filtered.length} receipt{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setDeductibleOnly(!deductibleOnly)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border transition-all ${
            deductibleOnly
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-muted-foreground border-border hover:text-foreground'
          }`}
        >
          <Filter size={12} /> {deductibleOnly ? 'Deductible Only' : 'All Receipts'}
        </button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card p-4 rounded-xl border border-border">
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Grand Total</p>
          <p className="font-serif text-foreground text-xl mt-1">${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border">
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Total Deductible</p>
          <p className="font-serif text-primary text-xl mt-1">${totalDeductible.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* By Tax Year */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-3 border-b border-border">
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">By Tax Year</p>
        </div>
        {byYear.length === 0 ? (
          <p className="text-muted-foreground text-[11px] text-center py-6">No data.</p>
        ) : byYear.map(([year, data]) => (
          <div key={year} className="flex items-center justify-between px-3 py-2.5 border-b border-border last:border-b-0">
            <div>
              <p className="text-foreground text-sm font-semibold">{year}</p>
              <p className="text-[10px] text-muted-foreground">{data.count} receipt{data.count !== 1 ? 's' : ''}</p>
            </div>
            <div className="text-right">
              <p className="font-serif text-foreground font-bold">${data.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              <p className="text-[9px] text-primary font-bold">${data.deductible.toLocaleString(undefined, { minimumFractionDigits: 2 })} deductible</p>
            </div>
          </div>
        ))}
      </div>

      {/* By Category */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-3 border-b border-border">
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">By Category</p>
        </div>
        {byCategory.length === 0 ? (
          <p className="text-muted-foreground text-[11px] text-center py-6">No data.</p>
        ) : byCategory.map(([cat, total]) => {
          const pct = grandTotal > 0 ? (total / grandTotal) * 100 : 0;
          return (
            <div key={cat} className="px-3 py-2.5 border-b border-border last:border-b-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-foreground text-sm font-semibold">{cat}</p>
                <p className="font-serif text-foreground font-bold">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
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
