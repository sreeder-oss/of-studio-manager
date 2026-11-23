import { describe, expect, it } from 'vitest';
import {
  extractVerifiedEmailsFromText,
  isJunkBusinessEmail,
  normalizeLeadName,
  normalizeLeadPhone,
  parseVerifiedLeadsCsv,
  planLeadSync,
  type SyncableContact,
} from '@/lib/leadSync';
import type { SeedLead } from '@/data/seedLeads';
import { LEAD_BATCHES } from '@/data/seedLeads';

describe('isJunkBusinessEmail', () => {
  it('blocks staging, website-builder, noreply, and image-asset strings', () => {
    expect(isJunkBusinessEmail(null)).toBe(true);
    expect(isJunkBusinessEmail('')).toBe(true);
    expect(isJunkBusinessEmail('info@cadec10.sg-host.com')).toBe(true);
    expect(isJunkBusinessEmail('abc123@sentry-next.wixpress.com')).toBe(true);
    expect(isJunkBusinessEmail('noreply@builder.com')).toBe(true);
    expect(isJunkBusinessEmail('no-reply@builder.com')).toBe(true);
    expect(isJunkBusinessEmail('logo@2x.png')).toBe(true);
    expect(isJunkBusinessEmail('user@example.com')).toBe(true);
  });

  it('allows real company and personal business emails', () => {
    expect(isJunkBusinessEmail('cwright@cliffwrightdesign.com')).toBe(false);
    expect(isJunkBusinessEmail('estimating@snydercg.com')).toBe(false);
    expect(isJunkBusinessEmail('hello@balminteriors.com')).toBe(false);
    expect(isJunkBusinessEmail('owner.studio@gmail.com')).toBe(false);
  });
});

describe('extractVerifiedEmailsFromText', () => {
  it('filters junk and ranks company-domain estimating/info emails first', () => {
    const text = `
      Contact us at info@cadec10.sg-host.com or noreply@snydercg.com.
      General: hello@otheragency.com
      Office: info@snydercg.com
      Bids: estimating@snydercg.com
      Asset: hero@2x.webp
    `;
    const emails = extractVerifiedEmailsFromText(text, 'https://www.snydercg.com/contact');
    expect(emails).toEqual([
      'estimating@snydercg.com',
      'info@snydercg.com',
      'hello@otheragency.com',
    ]);
  });
});

describe('normalizeLeadPhone & normalizeLeadName', () => {
  it('normalizes US 10- and 11-digit phone formats consistently', () => {
    expect(normalizeLeadPhone('(405) 816-0750')).toBe('4058160750');
    expect(normalizeLeadPhone('+1 405.816.0750')).toBe('4058160750');
    expect(normalizeLeadPhone('405-816-0750')).toBe('4058160750');
    expect(normalizeLeadPhone('short')).toBe('');
  });

  it('normalizes company names by stripping entity suffixes and parenthetical notes', () => {
    expect(normalizeLeadName('RK Contractors LLC (Tulsa)')).toBe('rk contractors');
    expect(normalizeLeadName('RK Contractors, Inc.')).toBe('rk contractors');
  });
});

describe('planLeadSync', () => {
  it('dedupes by phone and name, backfills missing/junk emails and sent status, and preserves separate branch offices', () => {
    const existing: SyncableContact[] = [
      {
        id: 'c1',
        name: 'Cliff Wright Design',
        email: null,
        phone: '405-555-0101',
        address: 'OKC',
        notes: 'Category: Architect',
        type: 'Lead',
        status: 'Pending',
      },
      {
        id: 'c2',
        name: 'Massimo Interior Design',
        email: 'info@cadec10.sg-host.com',
        phone: '918-555-0102',
        address: 'Tulsa, OK',
        notes: 'Category: Interior Design',
        type: 'Lead',
        status: 'Pending',
      },
      {
        id: 'c3',
        name: 'Hoffman Custom Homes — Tulsa',
        email: 'justin@hoffmancustomhomes.com',
        phone: '918-555-0199',
        address: 'Tulsa',
        notes: null,
        type: 'Lead',
        status: 'Pending',
      },
    ];

    const incoming: SeedLead[] = [
      // Matches c1 by phone even with LLC suffix difference -> should backfill email + sent status
      {
        name: 'Cliff Wright Design LLC',
        email: 'cwright@cliffwrightdesign.com',
        phone: '(405) 555-0101',
        address: 'Oklahoma City, OK',
        notes: 'Verified At: https://cliffwrightdesign.com | [Sent via Company/Website Doc]',
        type: 'Lead',
        status: 'Active',
      },
      // Matches c2 with bogus sg-host.com email -> replaces with real email
      {
        name: 'Massimo Interior Design',
        email: 'studio@massimointeriors.com',
        phone: '918-555-0102',
        address: 'Tulsa, OK',
        notes: null,
        type: 'Lead',
        status: 'Pending',
      },
      // Branch office with same phone as Tulsa branch -> must insert as separate contact
      {
        name: 'Hoffman Custom Homes — Edmond/OKC',
        email: 'lorri@hoffmancustomhomes.com',
        phone: '918-555-0199',
        address: 'Edmond/OKC',
        notes: null,
        type: 'Lead',
        status: 'Pending',
      },
      // Brand new lead
      {
        name: 'Balm Interiors',
        email: 'hello@balminteriors.com',
        phone: '405-555-0188',
        address: 'OKC',
        notes: null,
        type: 'Lead',
        status: 'Pending',
      },
    ];

    const { toInsert, toBackfill } = planLeadSync(existing, incoming);

    expect(toInsert.map((l) => l.name)).toEqual([
      'Hoffman Custom Homes — Edmond/OKC',
      'Balm Interiors',
    ]);

    expect(toBackfill).toHaveLength(2);
    const c1Update = toBackfill.find((u) => u.existing.id === 'c1')!;
    expect(c1Update.patch.email).toBe('cwright@cliffwrightdesign.com');
    expect(c1Update.patch.address).toBe('Oklahoma City, OK');
    expect(c1Update.patch.status).toBe('Active');
    expect(c1Update.patch.notes).toContain('[Sent via Company/Website Doc]');
    expect(c1Update.addedFields).toEqual(expect.arrayContaining(['email', 'address', 'sent status']));

    const c2Update = toBackfill.find((u) => u.existing.id === 'c2')!;
    expect(c2Update.patch.email).toBe('studio@massimointeriors.com');
    expect(c2Update.addedFields).toEqual(['email']);
  });
});

describe('parseVerifiedLeadsCsv', () => {
  it('parses Master Verified Outreach Leads CSV and strips junk emails', () => {
    const csv = [
      'Company,Category,City / Region,Verified Email,Email Credibility,Phone,Website,Instagram,Status,Notes',
      '"Snyder Construction Group","Commercial GC","Springfield, MO","info@snydercg.com","Verified (Found on Website)","417-887-6897","https://snydercg.com","@snydercg","Ready to Email","Large regional GC"',
      '"Massimo Interior Design","Interior Design","Tulsa, OK","info@cadec10.sg-host.com","No Public Email","","https://massimointeriors.com","@massimo","IG DM Only","Staging email blocked"',
      '"Hoffman Custom Homes","Luxury Builder","Tulsa, OK","justin@hoffmancustomhomes.com","Verified (On Website)","918-555-1212","https://hoffmancustomhomes.com","@hoffman","Sent","Already contacted"',
    ].join('\n');

    const leads = parseVerifiedLeadsCsv(csv);
    expect(leads).toHaveLength(3);

    expect(leads[0]).toMatchObject({
      name: 'Snyder Construction Group',
      email: 'info@snydercg.com',
      phone: '417-887-6897',
      address: 'Springfield, MO',
      status: 'Pending',
    });

    expect(leads[1]).toMatchObject({
      name: 'Massimo Interior Design',
      email: null,
      status: 'Pending',
    });

    expect(leads[2]).toMatchObject({
      name: 'Hoffman Custom Homes',
      email: 'justin@hoffmancustomhomes.com',
      status: 'Active',
    });
    expect(leads[2].notes).toContain('[Sent via Master Lead Sheet]');
  });
});

describe('LEAD_BATCHES integrity', () => {
  it('contains zero junk emails and zero duplicate company names across all batches', () => {
    const allLeads = LEAD_BATCHES.flatMap((b) => b.leads);
    const names = new Set<string>();
    for (const lead of allLeads) {
      const key = normalizeLeadName(lead.name);
      expect(names.has(key), `Duplicate seed lead: ${lead.name}`).toBe(false);
      names.add(key);
      if (lead.email) {
        expect(isJunkBusinessEmail(lead.email), `Junk email in seed leads: ${lead.email}`).toBe(false);
      }
    }
    expect(allLeads.length).toBe(66);
  });
});
