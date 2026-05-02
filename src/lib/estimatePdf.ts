/**
 * Branded multi-page Organic Finishes estimate PDF.
 * Mirrors the layout of our reference estimates (Bauwerks Limewash / Biolime
 * 3-coat) and renders any EstimateDoc with the same level of detail.
 *
 * Brand: white paper, deep navy ink, green accent (#49A33D), beige hairlines.
 */

import jsPDF from 'jspdf';
import autoTable, { type RowInput } from 'jspdf-autotable';
import { recalcEstimate, type EstimateDoc } from './estimateSchema';

// --- Brand tokens ----------------------------------------------------------
const NAVY: [number, number, number] = [15, 23, 42];          // #0F172A
const NAVY_SOFT: [number, number, number] = [51, 65, 85];     // #334155
const GREEN: [number, number, number] = [73, 163, 61];        // #49A33D
const BEIGE: [number, number, number] = [232, 220, 196];      // #E8DCC4
const HAIRLINE: [number, number, number] = [210, 200, 180];
const MUTED: [number, number, number] = [115, 115, 115];
const PANEL: [number, number, number] = [248, 246, 240];      // very light beige

const PAGE_W = 612; // 8.5"
const PAGE_H = 792; // 11"
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;

// --- Helpers ---------------------------------------------------------------
const fmt = (n: number) =>
  `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtCompact = (n: number) =>
  `$${Math.round(n || 0).toLocaleString('en-US')}`;

const today = () =>
  new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

interface CompanyInfo {
  name: string;
  email: string;
  city: string;
  website?: string;
}
const DEFAULT_COMPANY: CompanyInfo = {
  name: 'ORGANIC FINISHES LLC',
  email: 'contact@organicfinishesllc.org',
  city: 'Tulsa, Oklahoma',
  website: 'organicfinishestulsa.com',
};

interface RenderCtx {
  doc: jsPDF;
  est: EstimateDoc;
  company: CompanyInfo;
  pageNum: number;
}

// Header band on every page
function drawHeader(ctx: RenderCtx) {
  const { doc, est, company } = ctx;
  // green accent rule
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, PAGE_W, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text(company.name, MARGIN, 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...NAVY_SOFT);
  doc.text(est.title || 'Project Estimate', MARGIN, 42);

  // right side
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  const dateStr = today();
  doc.text(dateStr, PAGE_W - MARGIN, 28, { align: 'right' });
  doc.text(company.city, PAGE_W - MARGIN, 40, { align: 'right' });

  // hairline below header
  doc.setDrawColor(...HAIRLINE);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, 52, PAGE_W - MARGIN, 52);
}

// Footer on every page
function drawFooter(ctx: RenderCtx) {
  const { doc, company, pageNum } = ctx;
  doc.setDrawColor(...HAIRLINE);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, PAGE_H - 36, PAGE_W - MARGIN, PAGE_H - 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  const left = `${company.name.replace('ORGANIC FINISHES LLC', 'Organic Finishes LLC')} | ${company.email}`;
  doc.text(left, MARGIN, PAGE_H - 22);
  doc.text(`Page ${pageNum}`, PAGE_W - MARGIN, PAGE_H - 22, { align: 'right' });
}

// Ensure y has room; add page if not
function ensureSpace(ctx: RenderCtx, y: number, needed: number): number {
  if (y + needed > PAGE_H - 50) {
    ctx.doc.addPage();
    ctx.pageNum += 1;
    drawHeader(ctx);
    drawFooter(ctx);
    return 72; // top of new page
  }
  return y;
}

function sectionLabel(ctx: RenderCtx, y: number, label: string): number {
  const { doc } = ctx;
  y = ensureSpace(ctx, y, 28);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...GREEN);
  doc.text(label.toUpperCase(), MARGIN, y);
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, y + 3, MARGIN + 28, y + 3);
  return y + 16;
}

function paragraph(
  ctx: RenderCtx,
  y: number,
  text: string,
  opts: { bold?: boolean; size?: number; color?: [number, number, number]; italic?: boolean } = {}
): number {
  const { doc } = ctx;
  const size = opts.size ?? 9.5;
  const color = opts.color ?? NAVY;
  doc.setFont('helvetica', opts.bold ? 'bold' : opts.italic ? 'italic' : 'normal');
  doc.setFontSize(size);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(text, CONTENT_W) as string[];
  const lineHeight = size * 1.35;
  for (const ln of lines) {
    y = ensureSpace(ctx, y, lineHeight);
    doc.text(ln, MARGIN, y);
    y += lineHeight;
  }
  return y;
}

// --- Page 1: cover header + project info + summary ------------------------
function renderCover(ctx: RenderCtx): number {
  const { doc, est } = ctx;
  let y = 78;

  // Big title
  doc.setFont('times', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...NAVY);
  const titleLines = doc.splitTextToSize(est.title || 'Project Estimate', CONTENT_W) as string[];
  for (const ln of titleLines) {
    doc.text(ln, MARGIN, y);
    y += 24;
  }
  y += 4;

  // Subtitle line: substrate + system
  if (est.substrate || est.system_name) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...NAVY_SOFT);
    const sub = [est.system_name, est.substrate].filter(Boolean).join(' on ');
    doc.text(sub, MARGIN, y);
    y += 18;
  }

  // Two-column info block (Project | Estimate Details)
  const colW = (CONTENT_W - 16) / 2;
  const boxTop = y;
  const boxH = 110;
  doc.setFillColor(...PANEL);
  doc.setDrawColor(...HAIRLINE);
  doc.roundedRect(MARGIN, boxTop, colW, boxH, 4, 4, 'FD');
  doc.roundedRect(MARGIN + colW + 16, boxTop, colW, boxH, 4, 4, 'FD');

  // Left column — PROJECT
  let ly = boxTop + 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...GREEN);
  doc.text('PROJECT', MARGIN + 12, ly);
  ly += 14;
  const projRows: [string, string][] = [
    ['Client', est.client_name || '—'],
    ['Location', est.project_address || '—'],
    ['Substrate', est.substrate || '—'],
    ['System', est.system_name || '—'],
  ];
  for (const [k, v] of projRows) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(k.toUpperCase(), MARGIN + 12, ly);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...NAVY);
    const vLines = doc.splitTextToSize(v, colW - 24) as string[];
    doc.text(vLines[0] || '', MARGIN + 12, ly + 11);
    ly += 22;
  }

  // Right column — ESTIMATE DETAILS
  ly = boxTop + 16;
  const rx = MARGIN + colW + 16 + 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...GREEN);
  doc.text('ESTIMATE DETAILS', rx, ly);
  ly += 14;
  const detailRows: [string, string][] = [
    ['Date', today()],
    ['Net area', est.area_sf > 0 ? `${est.area_sf.toLocaleString()} SF` : '—'],
    ['Duration', est.duration_estimate || '—'],
    ['Valid', '30 days from date of issue'],
  ];
  for (const [k, v] of detailRows) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(k.toUpperCase(), rx, ly);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...NAVY);
    doc.text(v, rx, ly + 11);
    ly += 22;
  }

  y = boxTop + boxH + 18;

  // Takeoff basis paragraph
  if (est.area_note && est.area_note.trim()) {
    y = sectionLabel(ctx, y, 'Takeoff basis — please read before accepting');
    y = paragraph(ctx, y, est.area_note, { size: 9, color: NAVY_SOFT });
    y += 6;
  }

  // Project summary tiles (8 metrics in 2 rows of 4)
  y = sectionLabel(ctx, y, 'Project Summary');
  const tiles: [string, string][] = [
    ['Net Area', est.area_sf > 0 ? `${est.area_sf.toLocaleString()} SF` : '—'],
    ['Labor', fmtCompact(est.sections.find((s) => /labor/i.test(s.label))?.subtotal || 0)],
    ['Materials', fmtCompact(est.sections.find((s) => /material/i.test(s.label))?.subtotal || 0)],
    ['Equipment', fmtCompact(est.sections.find((s) => /equipment|site/i.test(s.label))?.subtotal || 0)],
    ['Overhead', fmtCompact(est.overhead_amount)],
    ['Profit', fmtCompact(est.profit_amount)],
    ['Per SF', est.per_sf > 0 ? `${fmt(est.per_sf)}/SF` : '—'],
    ['PROJECT TOTAL', fmtCompact(est.total)],
  ];
  const tileW = (CONTENT_W - 12) / 4;
  const tileH = 44;
  for (let i = 0; i < tiles.length; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const tx = MARGIN + col * (tileW + 4);
    const ty = y + row * (tileH + 4);
    const isTotal = i === tiles.length - 1;
    if (isTotal) {
      doc.setFillColor(...NAVY);
    } else {
      doc.setFillColor(...PANEL);
    }
    doc.setDrawColor(...HAIRLINE);
    doc.roundedRect(tx, ty, tileW, tileH, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...(isTotal ? ([220, 215, 200] as [number, number, number]) : MUTED));
    doc.text(tiles[i][0].toUpperCase(), tx + 8, ty + 14);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isTotal ? 13 : 11);
    doc.setTextColor(...(isTotal ? ([255, 255, 255] as [number, number, number]) : NAVY));
    doc.text(tiles[i][1], tx + 8, ty + 32);
  }
  y += 2 * (tileH + 4) + 10;

  return y;
}

// --- Detailed pricing table (sections A–E) --------------------------------
function renderPricingTable(ctx: RenderCtx, startY: number): number {
  const { doc, est } = ctx;

  const body: RowInput[] = [];
  for (const section of est.sections) {
    // Section header row spanning all columns
    body.push([
      {
        content: section.label,
        colSpan: 5,
        styles: {
          fillColor: BEIGE,
          textColor: NAVY,
          fontStyle: 'bold',
          fontSize: 9,
          cellPadding: { top: 6, bottom: 6, left: 8, right: 8 },
        },
      },
    ]);
    for (const li of section.line_items) {
      const desc = li.sub_note
        ? `${li.description}\n${li.sub_note}`
        : li.description;
      body.push([
        { content: desc, styles: { fontSize: 9 } },
        { content: String(li.qty || ''), styles: { halign: 'right', fontSize: 9 } },
        { content: li.unit || '', styles: { halign: 'center', fontSize: 9 } },
        {
          content: li.unit_cost > 0 ? fmt(li.unit_cost) : '—',
          styles: { halign: 'right', fontSize: 9 },
        },
        {
          content: fmt(li.total),
          styles: { halign: 'right', fontSize: 9, fontStyle: 'bold' },
        },
      ]);
    }
    body.push([
      {
        content: `${section.label.split(' — ')[0]} subtotal`,
        colSpan: 4,
        styles: {
          halign: 'right',
          fontStyle: 'bold',
          fontSize: 9,
          textColor: NAVY_SOFT,
          fillColor: [255, 255, 255] as [number, number, number],
        },
      },
      {
        content: fmt(section.subtotal),
        styles: {
          halign: 'right',
          fontStyle: 'bold',
          fontSize: 9.5,
          textColor: GREEN,
          fillColor: [255, 255, 255] as [number, number, number],
        },
      },
    ]);
  }

  // Final total row
  body.push([
    {
      content: 'ESTIMATED PROJECT TOTAL (excl. sales tax)',
      colSpan: 4,
      styles: {
        halign: 'right',
        fontStyle: 'bold',
        fontSize: 10,
        textColor: [255, 255, 255] as [number, number, number],
        fillColor: NAVY,
        cellPadding: { top: 8, bottom: 8, left: 8, right: 8 },
      },
    },
    {
      content: fmt(est.total - est.tax_amount),
      styles: {
        halign: 'right',
        fontStyle: 'bold',
        fontSize: 11,
        textColor: [255, 255, 255] as [number, number, number],
        fillColor: NAVY,
        cellPadding: { top: 8, bottom: 8, left: 8, right: 8 },
      },
    },
  ]);
  if (est.tax_amount > 0) {
    body.push([
      {
        content: `Sales tax on materials (est. ${est.tax_rate}%)`,
        colSpan: 4,
        styles: { halign: 'right', fontSize: 9, fontStyle: 'italic', textColor: MUTED },
      },
      {
        content: `+${fmt(est.tax_amount)}`,
        styles: { halign: 'right', fontSize: 9, fontStyle: 'italic', textColor: MUTED },
      },
    ]);
    body.push([
      {
        content: 'TOTAL INCLUDING TAX',
        colSpan: 4,
        styles: {
          halign: 'right',
          fontStyle: 'bold',
          fontSize: 10,
          textColor: NAVY,
          cellPadding: { top: 6, bottom: 6, left: 8, right: 8 },
        },
      },
      {
        content: fmt(est.total),
        styles: {
          halign: 'right',
          fontStyle: 'bold',
          fontSize: 11,
          textColor: GREEN,
          cellPadding: { top: 6, bottom: 6, left: 8, right: 8 },
        },
      },
    ]);
  }
  if (est.per_sf > 0) {
    body.push([
      {
        content: 'Price per square foot (average)',
        colSpan: 4,
        styles: { halign: 'right', fontSize: 9, fontStyle: 'italic', textColor: MUTED },
      },
      {
        content: `${fmt(est.per_sf)} / SF`,
        styles: { halign: 'right', fontSize: 9, fontStyle: 'bold', textColor: NAVY },
      },
    ]);
  }

  autoTable(doc, {
    startY,
    margin: { left: MARGIN, right: MARGIN },
    head: [
      [
        { content: 'Description', styles: { halign: 'left' } },
        { content: 'Qty', styles: { halign: 'right' } },
        { content: 'Unit', styles: { halign: 'center' } },
        { content: 'Unit Cost', styles: { halign: 'right' } },
        { content: 'Total', styles: { halign: 'right' } },
      ],
    ],
    body,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: { top: 5, bottom: 5, left: 8, right: 8 },
      lineColor: HAIRLINE,
      lineWidth: 0.3,
      textColor: NAVY,
      valign: 'top',
    },
    headStyles: {
      fillColor: NAVY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      cellPadding: { top: 7, bottom: 7, left: 8, right: 8 },
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 42 },
      2: { cellWidth: 42 },
      3: { cellWidth: 60 },
      4: { cellWidth: 64 },
    },
    didDrawPage: () => {
      // header/footer redrawn on overflow pages
      if (ctx.pageNum < (doc.internal.pages.length - 1)) {
        ctx.pageNum = doc.internal.pages.length - 1;
        drawHeader(ctx);
        drawFooter(ctx);
      }
    },
  });

  // @ts-expect-error - autoTable attaches lastAutoTable
  return (doc.lastAutoTable?.finalY ?? startY) + 16;
}

// --- Tier comparison ------------------------------------------------------
function renderTiers(ctx: RenderCtx, y: number): number {
  const { doc, est } = ctx;
  if (!est.bid_range) return y;
  y = ensureSpace(ctx, y, 110);
  y = sectionLabel(ctx, y, 'Scope tier comparison');

  const rows: RowInput[] = (['low', 'mid', 'high'] as const).map((k) => {
    const isMid = k === 'mid';
    const label = k === 'low' ? 'Low — lean scope' : k === 'mid' ? 'Mid — recommended' : 'High — premium';
    return [
      {
        content: label,
        styles: { fontStyle: 'bold', textColor: isMid ? GREEN : NAVY, fontSize: 9 },
      },
      {
        content: est.bid_range![`${k}_note` as 'low_note' | 'mid_note' | 'high_note'] || '',
        styles: { fontSize: 8.5, textColor: NAVY_SOFT },
      },
      {
        content: est.area_sf > 0 ? `${fmt(est.bid_range![k] / est.area_sf)}/SF` : '—',
        styles: { halign: 'right', fontSize: 9, textColor: NAVY_SOFT },
      },
      {
        content: fmtCompact(est.bid_range![k]),
        styles: {
          halign: 'right',
          fontSize: 10,
          fontStyle: 'bold',
          textColor: isMid ? GREEN : NAVY,
        },
      },
    ];
  });

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Tier', 'What you get / what changes', '$/SF', 'Total']],
    body: rows,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: { top: 6, bottom: 6, left: 8, right: 8 },
      lineColor: HAIRLINE,
      lineWidth: 0.3,
      valign: 'top',
    },
    headStyles: {
      fillColor: BEIGE,
      textColor: NAVY,
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    columnStyles: {
      0: { cellWidth: 110 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 60 },
      3: { cellWidth: 70 },
    },
  });
  // @ts-expect-error
  return (doc.lastAutoTable?.finalY ?? y) + 16;
}

// --- Notes / exclusions / system note / acceptance ------------------------
function renderBack(ctx: RenderCtx, y: number): number {
  const { est } = ctx;

  if (est.assumptions.length) {
    y = sectionLabel(ctx, y, 'Key Assumptions');
    for (const a of est.assumptions) {
      y = ensureSpace(ctx, y, 18);
      ctx.doc.setFillColor(...GREEN);
      ctx.doc.circle(MARGIN + 3, y - 3, 1.4, 'F');
      y = paragraph(ctx, y - 0, `   ${a}`, { size: 9, color: NAVY_SOFT });
      y += 2;
    }
    y += 6;
  }

  if (est.exclusions.length) {
    y = sectionLabel(ctx, y, 'Exclusions');
    for (const e of est.exclusions) {
      y = ensureSpace(ctx, y, 18);
      ctx.doc.setDrawColor(...MUTED);
      ctx.doc.setLineWidth(0.6);
      ctx.doc.line(MARGIN + 1, y - 3, MARGIN + 5, y - 3);
      y = paragraph(ctx, y, `   ${e}`, { size: 9, color: NAVY_SOFT });
      y += 2;
    }
    y += 6;
  }

  if (est.system_note && est.system_note.trim()) {
    y = sectionLabel(ctx, y, 'About this system');
    // Light tinted box for the prose
    const boxTop = y - 6;
    const lines = ctx.doc.splitTextToSize(est.system_note, CONTENT_W - 16) as string[];
    const lineH = 9.5 * 1.45;
    const boxH = lines.length * lineH + 16;
    y = ensureSpace(ctx, boxTop + 6, boxH);
    ctx.doc.setFillColor(...PANEL);
    ctx.doc.setDrawColor(...HAIRLINE);
    ctx.doc.roundedRect(MARGIN, y - 6, CONTENT_W, boxH, 4, 4, 'FD');
    let py = y + 8;
    ctx.doc.setFont('helvetica', 'normal');
    ctx.doc.setFontSize(9.5);
    ctx.doc.setTextColor(...NAVY_SOFT);
    for (const ln of lines) {
      ctx.doc.text(ln, MARGIN + 8, py);
      py += lineH;
    }
    y = py + 8;
  }

  // Acceptance block
  y = ensureSpace(ctx, y, 130);
  y = sectionLabel(ctx, y, 'Acceptance');
  y = paragraph(
    ctx,
    y,
    'This estimate is valid for 30 days from the date of issue and covers the scope described above. Please sign below to authorize work. A 30% deposit is due upon contract signing; the balance is invoiced at project milestones.',
    { size: 9, color: NAVY_SOFT }
  );
  y += 16;

  // Signature lines
  const colW = (CONTENT_W - 24) / 2;
  ctx.doc.setDrawColor(...NAVY_SOFT);
  ctx.doc.setLineWidth(0.6);
  ctx.doc.line(MARGIN, y + 24, MARGIN + colW, y + 24);
  ctx.doc.line(MARGIN + colW + 24, y + 24, MARGIN + 2 * colW + 24, y + 24);
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(7.5);
  ctx.doc.setTextColor(...MUTED);
  ctx.doc.text('CLIENT SIGNATURE', MARGIN, y + 36);
  ctx.doc.text('DATE', MARGIN + colW + 24, y + 36);

  y += 56;
  ctx.doc.line(MARGIN, y + 24, MARGIN + colW, y + 24);
  ctx.doc.line(MARGIN + colW + 24, y + 24, MARGIN + 2 * colW + 24, y + 24);
  ctx.doc.text('PRINTED NAME', MARGIN, y + 36);
  ctx.doc.text('AUTHORIZED BY (ORGANIC FINISHES LLC)', MARGIN + colW + 24, y + 36);

  return y + 60;
}

// --- Public API ------------------------------------------------------------
export interface BuildEstimatePdfOptions {
  company?: Partial<CompanyInfo>;
  filename?: string;
}

/** Build the jsPDF document in memory (no I/O). */
export function buildEstimatePdf(raw: EstimateDoc, opts: BuildEstimatePdfOptions = {}): jsPDF {
  const company: CompanyInfo = { ...DEFAULT_COMPANY, ...(opts.company || {}) };
  const est = recalcEstimate(raw);

  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const ctx: RenderCtx = { doc, est, company, pageNum: 1 };

  drawHeader(ctx);
  drawFooter(ctx);

  let y = renderCover(ctx);
  y = sectionLabel(ctx, y + 4, 'Detailed scope & pricing');
  y = renderPricingTable(ctx, y);
  y = renderTiers(ctx, y);
  renderBack(ctx, y);

  // Sweep all pages and re-stamp footer with correct page numbers
  const total = doc.internal.pages.length - 1;
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFillColor(255, 255, 255);
    doc.rect(0, PAGE_H - 44, PAGE_W, 44, 'F');
    drawFooter({ ...ctx, pageNum: p });
  }
  return doc;
}

/** Build and trigger a browser download. */
export function downloadEstimatePdf(raw: EstimateDoc, opts: BuildEstimatePdfOptions = {}) {
  const doc = buildEstimatePdf(raw, opts);
  const safeTitle = (raw.title || 'Estimate').replace(/[^a-z0-9]+/gi, '_').slice(0, 60);
  const filename = opts.filename || `OF_Estimate_${safeTitle}.pdf`;
  doc.save(filename);
}

/**
 * Try to coerce an unknown stored value into an EstimateDoc.
 * Estimates created via the AI flow store the full structured doc in
 * `estimates.line_items` (jsonb). Older estimates with only flat
 * `[{ scope, materials, amount }]` line items are converted into a single
 * "A — Project Scope" section so the PDF still renders cleanly.
 */
export function coerceToEstimateDoc(stored: unknown, fallback: {
  title?: string;
  client_name?: string;
  total?: number;
  tax_rate?: number;
} = {}): EstimateDoc | null {
  if (!stored) return null;

  // Already a structured EstimateDoc?
  if (typeof stored === 'object' && stored !== null && 'sections' in (stored as any) && Array.isArray((stored as any).sections)) {
    return stored as EstimateDoc;
  }

  // Legacy flat array of { scope/description, materials, amount }
  if (Array.isArray(stored)) {
    const items = stored as Array<{ scope?: string; description?: string; materials?: string; amount?: number }>;
    const lines = items.map((it) => ({
      description: it.scope || it.description || 'Line item',
      sub_note: it.materials || '',
      qty: 1,
      unit: 'lot',
      unit_cost: Number(it.amount || 0),
      total: Number(it.amount || 0),
    }));
    const subtotal = lines.reduce((a, b) => a + b.total, 0);
    return {
      title: fallback.title || 'Project Estimate',
      client_name: fallback.client_name || '',
      project_address: '',
      substrate: '',
      system_name: '',
      area_sf: 0,
      area_note: '',
      duration_estimate: '',
      sections: [
        { label: 'A — Project Scope', line_items: lines, subtotal },
        { label: 'B — Materials', line_items: [], subtotal: 0 },
        { label: 'C — Labor', line_items: [], subtotal: 0 },
        { label: 'D — Equipment & Site', line_items: [], subtotal: 0 },
        { label: 'E — Overhead & Profit', line_items: [], subtotal: 0 },
      ],
      direct_cost_subtotal: subtotal,
      overhead_pct: 0,
      overhead_amount: 0,
      profit_pct: 0,
      profit_amount: 0,
      tax_rate: (fallback.tax_rate ?? 0) * 100,
      tax_amount: 0,
      total: fallback.total ?? subtotal,
      per_sf: 0,
      assumptions: [],
      exclusions: [],
      system_note: '',
    };
  }

  return null;
}
