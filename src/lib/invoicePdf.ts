/**
 * Branded multi-page Organic Finishes INVOICE PDF.
 * Same visual language as estimatePdf.ts (white paper, deep navy ink,
 * green accent, beige hairlines) but tailored to invoicing:
 *   - Big "INVOICE" wordmark + invoice #
 *   - Bill-to / Bill-from / Service period block
 *   - Status & balance-due hero tile
 *   - Itemized work-completed table
 *   - Payments received history
 *   - Payment instructions / late-fee block
 *   - Signature / thank-you footer
 */

import jsPDF from 'jspdf';
import autoTable, { type RowInput } from 'jspdf-autotable';
import { recalcInvoice, type InvoiceDoc } from './invoiceSchema';

// --- Brand tokens ----------------------------------------------------------
const NAVY: [number, number, number] = [15, 23, 42];
const NAVY_SOFT: [number, number, number] = [51, 65, 85];
const GREEN: [number, number, number] = [73, 163, 61];
const BEIGE: [number, number, number] = [232, 220, 196];
const HAIRLINE: [number, number, number] = [210, 200, 180];
const MUTED: [number, number, number] = [115, 115, 115];
const PANEL: [number, number, number] = [248, 246, 240];
const RED: [number, number, number] = [185, 51, 51];

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;

// --- Helpers ---------------------------------------------------------------
const fmt = (n: number) =>
  `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtCompact = (n: number) =>
  `$${Math.round(n || 0).toLocaleString('en-US')}`;

const today = () =>
  new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

const fmtDate = (iso: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

interface CompanyInfo {
  name: string;
  email: string;
  phone?: string;
  address?: string;
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
  inv: InvoiceDoc;
  company: CompanyInfo;
  pageNum: number;
  payee: { payee_name: string; zelle_contact: string | null };
}

// Header band on every page
function drawHeader(ctx: RenderCtx) {
  const { doc, inv, company } = ctx;
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, PAGE_W, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text(company.name, MARGIN, 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...NAVY_SOFT);
  doc.text(inv.title || 'Invoice', MARGIN, 42);

  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(inv.invoice_number ? `Invoice ${inv.invoice_number}` : 'Invoice', PAGE_W - MARGIN, 28, { align: 'right' });
  doc.text(company.city, PAGE_W - MARGIN, 40, { align: 'right' });

  doc.setDrawColor(...HAIRLINE);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, 52, PAGE_W - MARGIN, 52);
}

function drawFooter(ctx: RenderCtx) {
  const { doc, company, pageNum } = ctx;
  doc.setDrawColor(...HAIRLINE);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, PAGE_H - 36, PAGE_W - MARGIN, PAGE_H - 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  const left = `Organic Finishes LLC | ${company.email}${company.phone ? ` | ${company.phone}` : ''}`;
  doc.text(left, MARGIN, PAGE_H - 22);
  doc.text(`Page ${pageNum}`, PAGE_W - MARGIN, PAGE_H - 22, { align: 'right' });
}

function ensureSpace(ctx: RenderCtx, y: number, needed: number): number {
  if (y + needed > PAGE_H - 50) {
    ctx.doc.addPage();
    ctx.pageNum += 1;
    drawHeader(ctx);
    drawFooter(ctx);
    return 72;
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

function statusInfo(inv: InvoiceDoc): { label: string; color: [number, number, number] } {
  if (inv.balance_due <= 0.005) return { label: 'PAID IN FULL', color: GREEN };
  if (inv.amount_paid > 0) return { label: 'PARTIALLY PAID', color: NAVY_SOFT };
  if (inv.due_date) {
    const due = new Date(inv.due_date);
    if (!isNaN(due.getTime()) && due < new Date()) return { label: 'OVERDUE', color: RED };
  }
  return { label: 'BALANCE DUE', color: NAVY };
}

// --- Page 1: cover ---------------------------------------------------------
function renderCover(ctx: RenderCtx): number {
  const { doc, inv, company } = ctx;
  let y = 78;

  // Big INVOICE wordmark
  doc.setFont('times', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(...NAVY);
  doc.text('INVOICE', MARGIN, y);

  // Invoice # + dates on the right
  const rxRight = PAGE_W - MARGIN;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text('INVOICE #', rxRight, y - 18, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.text(inv.invoice_number || '—', rxRight, y - 4, { align: 'right' });

  y += 14;
  // Project title under wordmark
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY_SOFT);
  const tLines = doc.splitTextToSize(inv.title || '', CONTENT_W * 0.65) as string[];
  for (const ln of tLines.slice(0, 2)) {
    doc.text(ln, MARGIN, y);
    y += 14;
  }
  y += 6;

  // Three-column block: BILL FROM | BILL TO | DETAILS
  const colGap = 12;
  const colW = (CONTENT_W - colGap * 2) / 3;
  const boxTop = y;
  const boxH = 118;
  doc.setFillColor(...PANEL);
  doc.setDrawColor(...HAIRLINE);
  for (let i = 0; i < 3; i++) {
    doc.roundedRect(MARGIN + i * (colW + colGap), boxTop, colW, boxH, 4, 4, 'FD');
  }

  const drawCol = (idx: number, title: string, lines: string[]) => {
    const cx = MARGIN + idx * (colW + colGap) + 12;
    let cy = boxTop + 16;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...GREEN);
    doc.text(title, cx, cy);
    cy += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...NAVY);
    for (const ln of lines) {
      const wrapped = doc.splitTextToSize(ln, colW - 24) as string[];
      for (const w of wrapped) {
        if (cy > boxTop + boxH - 10) return;
        doc.text(w, cx, cy);
        cy += 12;
      }
    }
  };

  drawCol(0, 'FROM', [
    company.name.replace('ORGANIC FINISHES LLC', 'Organic Finishes LLC'),
    company.address || company.city,
    company.email,
    company.phone || '',
    company.website || '',
  ].filter(Boolean));

  drawCol(1, 'BILL TO', [
    inv.client_name || '—',
    inv.project_address || '',
    inv.project_name ? `Project: ${inv.project_name}` : '',
  ].filter(Boolean));

  drawCol(2, 'DETAILS', [
    `Issued: ${inv.invoice_date ? fmtDate(inv.invoice_date) : today()}`,
    `Due: ${inv.due_date ? fmtDate(inv.due_date) : 'On receipt'}`,
    inv.service_period ? `Service period: ${inv.service_period}` : '',
    inv.milestone ? `Milestone: ${inv.milestone}` : '',
  ].filter(Boolean));

  y = boxTop + boxH + 18;

  // Balance-due hero tile
  const status = statusInfo(inv);
  const heroH = 72;
  doc.setFillColor(...NAVY);
  doc.roundedRect(MARGIN, y, CONTENT_W, heroH, 6, 6, 'F');

  // Status pill on the right
  const pillW = 130;
  doc.setFillColor(...status.color);
  doc.roundedRect(PAGE_W - MARGIN - pillW - 14, y + 14, pillW, 22, 11, 11, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(status.label, PAGE_W - MARGIN - 14 - pillW / 2, y + 29, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(220, 215, 200);
  doc.text('BALANCE DUE', MARGIN + 18, y + 24);

  doc.setFont('times', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(255, 255, 255);
  doc.text(fmt(inv.balance_due), MARGIN + 18, y + 56);

  // tiny labels right side
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(220, 215, 200);
  doc.text(`Invoice total ${fmt(inv.total)}`, PAGE_W - MARGIN - 14, y + 50, { align: 'right' });
  if (inv.amount_paid > 0) {
    doc.text(`Paid to date ${fmt(inv.amount_paid)}`, PAGE_W - MARGIN - 14, y + 62, { align: 'right' });
  }

  y += heroH + 18;

  // Work summary paragraph
  if (inv.work_summary && inv.work_summary.trim()) {
    y = sectionLabel(ctx, y, 'Work covered by this invoice');
    y = paragraph(ctx, y, inv.work_summary, { size: 9.5, color: NAVY_SOFT });
    y += 6;
  }

  return y;
}

// --- Itemized table -------------------------------------------------------
function renderItemTable(ctx: RenderCtx, startY: number): number {
  const { doc, inv } = ctx;

  const body: RowInput[] = [];
  for (const section of inv.sections) {
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
      const desc = li.sub_note ? `${li.description}\n${li.sub_note}` : li.description;
      body.push([
        { content: desc, styles: { fontSize: 9 } },
        { content: String(li.qty || ''), styles: { halign: 'right', fontSize: 9 } },
        { content: li.unit || '', styles: { halign: 'center', fontSize: 9 } },
        {
          content: li.unit_cost !== 0 ? fmt(li.unit_cost) : '—',
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

  // Totals stack
  body.push([
    {
      content: 'Subtotal',
      colSpan: 4,
      styles: { halign: 'right', fontSize: 9.5, textColor: NAVY_SOFT },
    },
    {
      content: fmt(inv.subtotal),
      styles: { halign: 'right', fontSize: 9.5, textColor: NAVY },
    },
  ]);
  if (inv.tax_amount > 0) {
    body.push([
      {
        content: `Sales tax (${inv.tax_rate}%)`,
        colSpan: 4,
        styles: { halign: 'right', fontSize: 9, fontStyle: 'italic', textColor: MUTED },
      },
      {
        content: fmt(inv.tax_amount),
        styles: { halign: 'right', fontSize: 9, fontStyle: 'italic', textColor: MUTED },
      },
    ]);
  }
  body.push([
    {
      content: 'INVOICE TOTAL',
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
      content: fmt(inv.total),
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
  if (inv.deposit_applied > 0) {
    body.push([
      {
        content: 'Less: deposit applied',
        colSpan: 4,
        styles: { halign: 'right', fontSize: 9, textColor: NAVY_SOFT },
      },
      {
        content: `(${fmt(inv.deposit_applied)})`,
        styles: { halign: 'right', fontSize: 9, textColor: NAVY_SOFT },
      },
    ]);
  }
  if (inv.amount_paid - inv.deposit_applied > 0.005) {
    body.push([
      {
        content: 'Less: payments received',
        colSpan: 4,
        styles: { halign: 'right', fontSize: 9, textColor: NAVY_SOFT },
      },
      {
        content: `(${fmt(inv.amount_paid - inv.deposit_applied)})`,
        styles: { halign: 'right', fontSize: 9, textColor: NAVY_SOFT },
      },
    ]);
  }
  body.push([
    {
      content: 'BALANCE DUE',
      colSpan: 4,
      styles: {
        halign: 'right',
        fontStyle: 'bold',
        fontSize: 11,
        textColor: NAVY,
        cellPadding: { top: 8, bottom: 8, left: 8, right: 8 },
      },
    },
    {
      content: fmt(inv.balance_due),
      styles: {
        halign: 'right',
        fontStyle: 'bold',
        fontSize: 12,
        textColor: GREEN,
        cellPadding: { top: 8, bottom: 8, left: 8, right: 8 },
      },
    },
  ]);

  autoTable(doc, {
    startY,
    margin: { left: MARGIN, right: MARGIN, top: 72, bottom: 50 },
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
      1: { cellWidth: 38 },
      2: { cellWidth: 38 },
      3: { cellWidth: 56 },
      4: { cellWidth: 84 },
    },
    didDrawPage: () => {
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

// --- Payments history ------------------------------------------------------
function renderPayments(ctx: RenderCtx, y: number): number {
  const { doc, inv } = ctx;
  const hasDeposit = (inv.deposit_applied || 0) > 0;
  const payments = inv.prior_payments || [];
  if (!hasDeposit && payments.length === 0) return y;

  y = ensureSpace(ctx, y, 80);
  y = sectionLabel(ctx, y, 'Payments received');

  const rows: RowInput[] = [];
  if (hasDeposit) {
    rows.push([
      { content: 'Deposit applied', styles: { fontSize: 9 } },
      { content: '—', styles: { halign: 'center', fontSize: 9, textColor: MUTED } },
      { content: '', styles: { fontSize: 9, textColor: NAVY_SOFT } },
      { content: fmt(inv.deposit_applied), styles: { halign: 'right', fontSize: 9, fontStyle: 'bold', textColor: GREEN } },
    ]);
  }
  for (const p of payments) {
    rows.push([
      { content: fmtDate(p.date), styles: { fontSize: 9 } },
      { content: p.method || '—', styles: { halign: 'center', fontSize: 9 } },
      { content: p.note || '', styles: { fontSize: 9, textColor: NAVY_SOFT } },
      { content: fmt(p.amount), styles: { halign: 'right', fontSize: 9, fontStyle: 'bold', textColor: GREEN } },
    ]);
  }
  rows.push([
    { content: 'Total received', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', fontSize: 9, textColor: NAVY } },
    { content: fmt(inv.amount_paid), styles: { halign: 'right', fontStyle: 'bold', fontSize: 9.5, textColor: GREEN } },
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN, top: 72, bottom: 50 },
    head: [['Date', 'Method', 'Reference', 'Amount']],
    body: rows,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: { top: 5, bottom: 5, left: 8, right: 8 },
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
      1: { cellWidth: 80 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 80 },
    },
  });
  // @ts-expect-error
  return (doc.lastAutoTable?.finalY ?? y) + 16;
}

// --- Payment instructions / notes / acceptance ----------------------------
function renderBack(ctx: RenderCtx, y: number): number {
  const { inv, doc } = ctx;

  // Payment instructions panel
  {
    y = sectionLabel(ctx, y, 'Payment Instructions');
    const lines: string[] = [`Please make checks payable to ${ctx.payee.payee_name}.`];
    if (ctx.payee.zelle_contact) lines.push(`Zelle: ${ctx.payee.zelle_contact}`);
    const text = lines.join('\n');
    const wrapped = doc.splitTextToSize(text, CONTENT_W - 16) as string[];
    const lineH = 9.5 * 1.45;
    const boxH = wrapped.length * lineH + 16;
    y = ensureSpace(ctx, y, boxH);
    doc.setFillColor(...PANEL);
    doc.setDrawColor(...HAIRLINE);
    doc.roundedRect(MARGIN, y - 6, CONTENT_W, boxH, 4, 4, 'FD');
    let py = y + 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...NAVY_SOFT);
    for (const ln of wrapped) {
      doc.text(ln, MARGIN + 8, py);
      py += lineH;
    }
    y = py + 12;
  }

  if (inv.notes && inv.notes.length > 0) {
    y = sectionLabel(ctx, y, 'Notes');
    for (const n of inv.notes) {
      y = ensureSpace(ctx, y, 18);
      doc.setFillColor(...GREEN);
      doc.circle(MARGIN + 3, y - 3, 1.4, 'F');
      y = paragraph(ctx, y, `   ${n}`, { size: 9, color: NAVY_SOFT });
      y += 2;
    }
    y += 6;
  }

  if (inv.thank_you_note && inv.thank_you_note.trim()) {
    y = ensureSpace(ctx, y, 36);
    doc.setFont('times', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    const lines = doc.splitTextToSize(inv.thank_you_note, CONTENT_W) as string[];
    for (const ln of lines) {
      doc.text(ln, MARGIN, y);
      y += 16;
    }
    y += 6;
  }

  return y;
}

// --- Public API ------------------------------------------------------------
export interface PayeeInfo { payee_name: string; zelle_contact?: string | null }

export interface BuildInvoicePdfOptions {
  company?: Partial<CompanyInfo>;
  payee?: PayeeInfo;
  filename?: string;
}

export function buildInvoicePdf(raw: InvoiceDoc, opts: BuildInvoicePdfOptions = {}): jsPDF {
  const company: CompanyInfo = { ...DEFAULT_COMPANY, ...(opts.company || {}) };
  const inv = recalcInvoice(raw);

  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const ctx: RenderCtx = { doc, inv, company, pageNum: 1, payee: { payee_name: opts.payee?.payee_name?.trim() || 'Shawn Reeder', zelle_contact: opts.payee?.zelle_contact?.trim() || null } };

  drawHeader(ctx);
  drawFooter(ctx);

  let y = renderCover(ctx);
  y = sectionLabel(ctx, y + 4, 'Itemized work');
  y = renderItemTable(ctx, y);
  y = renderPayments(ctx, y);
  renderBack(ctx, y);

  // Re-stamp footers with correct page numbers
  const total = doc.internal.pages.length - 1;
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFillColor(255, 255, 255);
    doc.rect(0, PAGE_H - 44, PAGE_W, 44, 'F');
    drawFooter({ ...ctx, pageNum: p });
  }
  return doc;
}

export function downloadInvoicePdf(raw: InvoiceDoc, opts: BuildInvoicePdfOptions = {}) {
  const doc = buildInvoicePdf(raw, opts);
  const safeNum = (raw.invoice_number || raw.title || 'Invoice').replace(/[^a-z0-9]+/gi, '_').slice(0, 60);
  const filename = opts.filename || `OF_Invoice_${safeNum}.pdf`;
  doc.save(filename);
}

/**
 * Coerce stored invoice data (jsonb line_items + flat columns) to InvoiceDoc.
 * Handles both AI-authored structured docs and legacy flat line items.
 */
export function coerceToInvoiceDoc(stored: unknown, fallback: {
  invoice_number?: string;
  title?: string;
  client_name?: string;
  project_address?: string;
  project_name?: string;
  invoice_date?: string;
  due_date?: string;
  subtotal?: number;
  tax_applied?: number;
  total?: number;
  paid?: boolean;
  paid_date?: string | null;
  /** Real figures from the invoice row and its payment ledger. */
  deposit_applied?: number;
  payments?: { date: string; method: string | null; reference: string | null; amount: number }[];
} = {}): InvoiceDoc | null {
  const ledger = (fallback.payments || []).map((p) => ({ date: p.date, amount: Number(p.amount || 0), method: p.method || '', note: p.reference || '' }));
  const deposit = Number(fallback.deposit_applied || 0);
  if (!stored && !fallback.total && !fallback.title) return null;

  // Already a structured InvoiceDoc?
  if (stored && typeof stored === 'object' && 'sections' in (stored as any) && Array.isArray((stored as any).sections)) {
    const merged = {
      ...(stored as any),
      invoice_number: (stored as any).invoice_number || fallback.invoice_number || '',
      client_name: (stored as any).client_name || fallback.client_name || '',
      project_address: (stored as any).project_address || fallback.project_address || '',
      project_name: (stored as any).project_name || fallback.project_name || '',
      invoice_date: (stored as any).invoice_date || fallback.invoice_date || '',
      due_date: (stored as any).due_date || fallback.due_date || '',
      deposit_applied: deposit,
      prior_payments: ledger,
      payment_terms: '', payment_methods: [],
    };
    return merged as InvoiceDoc;
  }

  // Legacy flat: array of { description/scope, amount }
  const allItems = Array.isArray(stored)
    ? (stored as Array<{ description?: string; scope?: string; amount?: number; sub_note?: string; kind?: string }>)
    : [];
  const items = allItems.filter((it) => it.kind !== 'change_order');
  const coLines = allItems.filter((it) => it.kind === 'change_order').map((it) => ({
    description: it.description || 'Change order', sub_note: '', qty: 1, unit: 'lot',
    unit_cost: Number(it.amount || 0), total: Number(it.amount || 0),
  }));
  const lines = items.map((it) => ({
    description: it.description || it.scope || 'Item',
    sub_note: it.sub_note || '',
    qty: 1,
    unit: 'lot',
    unit_cost: Number(it.amount || 0),
    total: Number(it.amount || 0),
  }));
  const subtotal = [...lines, ...coLines].reduce((a, b) => a + b.total, 0) || (fallback.subtotal ?? 0);
  const tax = fallback.tax_applied ?? 0;
  const total = fallback.total ?? (subtotal + tax);
  return {
    invoice_number: fallback.invoice_number || '',
    title: fallback.title || 'Invoice',
    client_name: fallback.client_name || '',
    project_address: fallback.project_address || '',
    project_name: fallback.project_name || '',
    substrate: '',
    system_name: '',
    area_sf: 0,
    invoice_date: fallback.invoice_date || '',
    due_date: fallback.due_date || '',
    service_period: '',
    work_summary: '',
    milestone: '',
    sections: [
      { label: 'Work completed', line_items: lines, subtotal: lines.reduce((a, b) => a + b.total, 0) },
      ...(coLines.length ? [{ label: 'Change orders', line_items: coLines, subtotal: coLines.reduce((a, b) => a + b.total, 0) }] : []),
    ],
    direct_cost_subtotal: subtotal,
    tax_rate: subtotal > 0 ? +((tax / subtotal) * 100).toFixed(2) : 0,
    tax_amount: tax,
    subtotal,
    total,
    deposit_applied: deposit,
    prior_payments: ledger,
    amount_paid: 0,
    balance_due: total,
    payment_terms: '',
    payment_methods: [],
    late_fee_note: '',
    thank_you_note: '',
    notes: [],
  };
}
