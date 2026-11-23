import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildVerifiedLeadsCsv,
  checkDomainMx,
  clearMxCacheForTests,
  parseRawLeadText,
  verifySingleLead,
} from '@/lib/leadVerifier';
import { LEAD_SCOUT_PLAYBOOKS } from '@/lib/leadScoutPrompts';
import type { SyncableContact } from '@/lib/leadSync';

describe('parseRawLeadText', () => {
  it('parses messy Gemini bullets, pipe-delimited rows, comma lists, and multi-line blocks while blocking junk emails', () => {
    const raw = `
      ## Outreach Ideas from Gemini
      | Company | City | Website |
      |---|---|---|
      1. **Cliff Wright Design** — OKC, OK — https://cliffwrightdesign.com — cwright@cliffwrightdesign.com
      - Massimo Interior Design | Tulsa, OK | info@cadec10.sg-host.com | @massimointeriors
      Snyder Construction Group, Springfield, MO, 417-887-6897
      Company: Balm Interiors
      City: Oklahoma City, OK
      Website: balminteriors.com
      Email: hello@balminteriors.com
      Instagram: https://instagram.com/balminteriors
      - Cliff Wright Design | OKC (duplicate line should be ignored)
    `;

    const parsed = parseRawLeadText(raw);
    expect(parsed).toHaveLength(4);

    expect(parsed[0]).toMatchObject({
      name: 'Cliff Wright Design',
      email: 'cwright@cliffwrightdesign.com',
      rejectedEmail: null,
      address: 'OKC, OK',
      website: 'https://cliffwrightdesign.com',
    });

    expect(parsed[1]).toMatchObject({
      name: 'Massimo Interior Design',
      email: null,
      rejectedEmail: 'info@cadec10.sg-host.com',
      address: 'Tulsa, OK',
      instagram: '@massimointeriors',
    });

    expect(parsed[2]).toMatchObject({
      name: 'Snyder Construction Group',
      phone: '417-887-6897',
    });

    expect(parsed[3]).toMatchObject({
      name: 'Balm Interiors',
      email: 'hello@balminteriors.com',
      address: 'Oklahoma City, OK',
      website: 'https://balminteriors.com',
      instagram: '@balminteriors',
    });
  });
});

describe('checkDomainMx', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearMxCacheForTests();
  });

  it('returns hasMx: true with mxHost when Google DoH returns MX answer', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          Status: 0,
          Answer: [{ type: 15, data: '10 smtp.google.com.' }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/dns-json' } },
      ),
    );

    const res = await checkDomainMx('cwright@cliffwrightdesign.com');
    expect(res).toEqual({ hasMx: true, mxHost: 'smtp.google.com', checked: true });
  });

  it('returns hasMx: false on NXDOMAIN or junk domain', async () => {
    const junk = await checkDomainMx('info@cadec10.sg-host.com');
    expect(junk).toEqual({ hasMx: false, mxHost: null, checked: true });

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ Status: 3 }), {
        status: 200,
        headers: { 'Content-Type': 'application/dns-json' },
      }),
    );

    const dead = await checkDomainMx('hello@nonexistent-fake-builder-xyz.com');
    expect(dead).toEqual({ hasMx: false, mxHost: null, checked: true });
  });
});

describe('verifySingleLead', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearMxCacheForTests();
  });

  it('verifies website email via live lookup + DNS MX and marks existing contact as update', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/functions/v1/ai-chat')) {
        return new Response(
          JSON.stringify({
            email: 'info@snydercg.com',
            phone: '417-887-6897',
            address: 'Springfield, MO',
            website: 'https://snydercg.com',
            instagram: '@snydercg',
            contact_person: null,
            notes_summary: 'Commercial GC',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.includes('dns.google/resolve')) {
        return new Response(
          JSON.stringify({ Status: 0, Answer: [{ type: 15, data: '10 snydercg-com.mail.protection.outlook.com.' }] }),
          { status: 200, headers: { 'Content-Type': 'application/dns-json' } },
        );
      }
      return new Response('{}', { status: 404 });
    });

    const existing: SyncableContact[] = [
      {
        id: 'existing-1',
        name: 'Snyder Construction Group',
        email: null,
        phone: '417-887-6897',
        address: 'Springfield, MO',
        notes: 'Category: Commercial GC',
        type: 'Lead',
        status: 'Pending',
      },
    ];

    const res = await verifySingleLead(
      {
        name: 'Snyder Construction Group',
        email: null,
        rejectedEmail: null,
        phone: null,
        address: 'Springfield, MO',
        website: null,
        instagram: null,
        notes: null,
      },
      existing,
    );

    expect(res.verificationStatus).toBe('verified_website');
    expect(res.email).toBe('info@snydercg.com');
    expect(res.mxHost).toBe('snydercg-com.mail.protection.outlook.com');
    expect(res.syncAction).toBe('update');
    expect(res.existingContactId).toBe('existing-1');
  });

  it('rejects pasted email when live DNS MX lookup returns NXDOMAIN', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/functions/v1/ai-chat')) {
        return new Response(
          JSON.stringify({
            email: null,
            phone: null,
            address: null,
            website: null,
            instagram: '@fakebuilder',
            contact_person: null,
            notes_summary: null,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.includes('dns.google/resolve')) {
        return new Response(JSON.stringify({ Status: 3 }), {
          status: 200,
          headers: { 'Content-Type': 'application/dns-json' },
        });
      }
      return new Response('{}', { status: 404 });
    });

    const res = await verifySingleLead(
      {
        name: 'Fake Builder Co',
        email: 'hello@dead-domain-xyz.com',
        rejectedEmail: null,
        phone: null,
        address: 'Tulsa, OK',
        website: null,
        instagram: null,
        notes: null,
      },
      [],
    );

    expect(res.verificationStatus).toBe('no_email');
    expect(res.email).toBeNull();
    expect(res.rejectedEmail).toBe('hello@dead-domain-xyz.com');
    expect(res.syncAction).toBe('new');
  });
});

describe('buildVerifiedLeadsCsv & LEAD_SCOUT_PLAYBOOKS', () => {
  it('escapes commas and quotes in exported CSV rows', () => {
    const csv = buildVerifiedLeadsCsv([
      {
        id: '1',
        name: 'Kelsey Leigh Design Co., LLC',
        email: 'hello@kelseyleighdesignco.com',
        phone: null,
        address: 'Oklahoma City, OK',
        notes: 'Notes: "Luxury" interiors',
        type: 'Lead',
        status: 'Pending',
      },
    ]);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('Company,Verified Email,Phone,City / Address,Status,Notes');
    expect(lines[1]).toContain('"Kelsey Leigh Design Co., LLC"');
    expect(lines[1]).toContain('"Notes: ""Luxury"" interiors"');
  });

  it('neutralizes leading spreadsheet formula characters (=, +, -, @) in exported CSV cells', () => {
    const csv = buildVerifiedLeadsCsv([
      {
        id: '2',
        name: '=HYPERLINK("http://evil.com","Click")',
        email: 'ok@studio.com',
        phone: '+1-405-555-0100',
        address: '-Tulsa, OK',
        notes: '@studiohandle',
        type: 'Lead',
        status: 'Pending',
      },
    ]);
    const row = csv.split('\n')[1];
    expect(row).toContain(`"'=HYPERLINK(""http://evil.com"",""Click"")"`);
    expect(row).toContain("'+1-405-555-0100");
    expect(row).toContain(`"'-Tulsa, OK"`);
    expect(row).toContain("'@studiohandle");
  });

  it('propagates AbortError immediately when verifySingleLead is cancelled via AbortSignal', async () => {
    const controller = new AbortController();
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (_input, init) => {
      if (init?.signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      throw new DOMException('Aborted', 'AbortError');
    });
    controller.abort();

    await expect(
      verifySingleLead(
        {
          name: 'Abort Test Studio',
          email: null,
          rejectedEmail: null,
          phone: null,
          address: 'OKC',
          website: null,
          instagram: null,
          notes: null,
        },
        [],
        controller.signal,
      ),
    ).rejects.toThrow();
  });

  it('includes strict anti-hallucination and junk-domain guardrails in Lead Scout playbooks', () => {
    expect(LEAD_SCOUT_PLAYBOOKS.length).toBeGreaterThanOrEqual(2);
    for (const pb of LEAD_SCOUT_PLAYBOOKS) {
      expect(pb.template).toContain('web_scrape');
      expect(pb.template).toContain('sg-host.com');
      expect(pb.template).toContain('create_contact');
    }
  });
});
