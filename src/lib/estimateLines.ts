/** Client-facing rows for a price-book estimate: how the price was reached. */
export type PriceRow =
  | { kind: 'service'; description: string; qty: number; unit: string; rate: number; amount: number; note: string | null }
  | { kind: 'materials'; description: string; amount: number }
  | { kind: 'other'; description: string; amount: number };

const n = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const r2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;

/** True when stored line_items are price-book lines (have a kind). */
export function isPriceBookLines(stored: unknown): stored is any[] {
  return Array.isArray(stored) && stored.length > 0 && stored.every((l) => l && typeof l === 'object' && ['service', 'materials', 'other'].includes(l.kind));
}

/** Order: each service line followed by its materials line(s); then other lines. */
export function toPriceRows(lines: any[]): PriceRow[] {
  const rows: PriceRow[] = [];
  const mats = lines.filter((l) => l.kind === 'materials');
  const used = new Set<any>();
  for (const l of lines.filter((l) => l.kind === 'service')) {
    rows.push({ kind: 'service', description: String(l.description || ''), qty: n(l.qty), unit: l.unit === 'day' ? 'day' : String(l.unit || 'SF'), rate: n(l.rate), amount: r2(n(l.amount)), note: l.note || null });
    for (const m of mats) if (!used.has(m) && m.area_id && m.area_id === l.area_id) { used.add(m); rows.push({ kind: 'materials', description: 'Materials at cost', amount: r2(n(m.amount)) }); }
  }
  for (const m of mats) if (!used.has(m)) rows.push({ kind: 'materials', description: 'Materials at cost', amount: r2(n(m.amount)) });
  for (const l of lines.filter((l) => l.kind === 'other')) rows.push({ kind: 'other', description: String(l.description || ''), amount: r2(n(l.amount)) });
  return rows;
}

export function rowsSum(rows: PriceRow[]): number {
  return r2(rows.reduce((s, r) => s + r.amount, 0));
}

/** Line amounts must add up to the subtotal to the cent. */
export function linesMatchSubtotal(rows: PriceRow[], subtotal: number): boolean {
  return Math.round(rowsSum(rows) * 100) === Math.round(n(subtotal) * 100);
}

/** Total SF across SF service rows. */
export function totalSf(rows: PriceRow[]): number {
  return r2(rows.reduce((s, r) => s + (r.kind === 'service' && r.unit === 'SF' ? r.qty : 0), 0));
}

export function pricePerSf(total: number, rows: PriceRow[]): number {
  const sf = totalSf(rows);
  return sf > 0 ? r2(n(total) / sf) : 0;
}
