import { buildEstimatePdf } from './src/lib/estimatePdf';
import fs from 'fs';

const sample = {
  title: 'Limewash + Plaster — Cherry Street Residence',
  client_name: 'Jonathan & Marcela Hawthorne',
  project_address: '4823 South Cherry Street, Tulsa, OK 74105 — Master suite + great room',
  substrate: 'Level-5 drywall + skim-coated brick fireplace',
  system_name: 'Bauwerks Limewash + Biolime 3-coat Tadelakt',
  area_sf: 2480,
  area_note: 'Net coverage area excludes 320 SF of trim, doors, windows. Final area to be field-verified before mobilization.',
  duration_estimate: '12–14 working days, weather permitting',
  valid_until: '2026-06-15',
  sections: [
    { label: 'A — Surface Preparation & Masking', subtotal: 0, line_items: [
      { description: 'Mask floors, fixtures, & trim with poly + paper', sub_note: 'reusable, low-tack tape on finished surfaces', qty: 2480, unit: 'SF', unit_cost: 0.45, total: 0 },
      { description: 'Sand & feather drywall imperfections to a Level-5 finish', sub_note: '', qty: 2480, unit: 'SF', unit_cost: 0.85, total: 0 },
    ]},
    { label: 'B — Materials', subtotal: 0, line_items: [
      { description: 'Bauwerks Limewash — 5gal pails, color "Calx Romano"', sub_note: '2 coats minimum; field test on site', qty: 6, unit: 'pail', unit_cost: 245, total: 0 },
      { description: 'Biolime base + finish coats', sub_note: '', qty: 14, unit: 'bag', unit_cost: 92, total: 0 },
    ]},
    { label: 'C — Labor', subtotal: 0, line_items: [
      { description: 'Application crew (lead + 2 finishers)', sub_note: '', qty: 96, unit: 'hr', unit_cost: 85, total: 0 },
    ]},
    { label: 'D — Equipment & Site', subtotal: 0, line_items: [
      { description: 'Scaffolding rental (12 days)', sub_note: '', qty: 1, unit: 'lot', unit_cost: 1450, total: 0 },
    ]},
    { label: 'E — Overhead & Profit', subtotal: 0, line_items: [] },
  ],
  direct_cost_subtotal: 0,
  overhead_pct: 8,
  overhead_amount: 0,
  profit_pct: 10,
  profit_amount: 0,
  tax_rate: 8.75,
  tax_amount: 0,
  total: 0,
  per_sf: 0,
  bid_range: {
    low: 18000, low_note: 'Limewash only, no Tadelakt fireplace',
    mid: 24500, mid_note: 'Recommended scope as quoted above',
    high: 31000, high_note: 'Adds Tadelakt to powder bath + waxed finish',
  },
  assumptions: [
    'All client-supplied finishes (light fixtures, hardware) are removed and re-installed by client or general contractor.',
    'Site temperature maintained between 60–80°F throughout cure window; humidity 35–60%.',
    'Continuous water + electric access on site; no off-hours work required.',
  ],
  exclusions: [
    'Drywall hanging, taping, and primer not included — surfaces presumed Level-4 ready.',
    'Permitting, dumpster fees, or HOA approvals.',
    'Structural repair of substrate cracks > 1/8 inch.',
  ],
  system_note: 'Bauwerks Limewash is a slaked-lime decorative coating that cures by carbonation, producing a soft, breathable, mineral-pigment finish. Biolime Tadelakt creates a polished, water-resistant surface ideal for wet areas when sealed with tinted soap.',
};

const pdf = buildEstimatePdf(sample);
fs.writeFileSync('/tmp/qa-estimate.pdf', Buffer.from(pdf.output('arraybuffer')));
console.log('OK');
