import { describe, expect, it } from 'vitest';
import {
  filterDirectoryContacts,
  filterEstimateClientCandidates,
  filterOutreachLeads,
  type FilterableContact,
} from '@/lib/contactFilters';

const SAMPLE_CONTACTS: FilterableContact[] = [
  {
    id: 'c1',
    name: 'Acme Builders',
    email: 'bids@acmebuilders.com',
    phone: '405-555-0101',
    address: 'OKC, OK',
    notes: 'Active residential GC',
    type: 'Client',
    status: 'Active',
  },
  {
    id: 'v1',
    name: 'Sullivan Supply',
    email: 'orders@sullivansupply.com',
    phone: '405-555-0102',
    address: 'Tulsa, OK',
    notes: 'Lime & plaster materials',
    type: 'Vendor',
    status: 'Active',
  },
  {
    id: 'l1',
    name: 'Cliff Wright Design',
    email: 'cwright@cliffwrightdesign.com',
    phone: null,
    address: 'OKC, OK',
    notes: 'Category: Architect',
    type: 'Lead',
    status: 'Pending',
  },
  {
    id: 'l2',
    name: 'Balm Interiors',
    email: 'hello@balminteriors.com',
    phone: null,
    address: 'OKC, OK',
    notes: 'Category: Interior Design',
    type: 'Lead',
    status: 'Pending',
  },
];

describe('filterDirectoryContacts', () => {
  it('excludes Outreach Leads from Contacts & Directory across all tabs', () => {
    expect(filterDirectoryContacts(SAMPLE_CONTACTS, 'all', '').map((c) => c.id)).toEqual(['c1', 'v1']);
    expect(filterDirectoryContacts(SAMPLE_CONTACTS, 'Client', '').map((c) => c.id)).toEqual(['c1']);
    expect(filterDirectoryContacts(SAMPLE_CONTACTS, 'Vendor', '').map((c) => c.id)).toEqual(['v1']);
  });

  it('filters directory contacts by search query', () => {
    expect(filterDirectoryContacts(SAMPLE_CONTACTS, 'all', 'sullivan').map((c) => c.id)).toEqual(['v1']);
    expect(filterDirectoryContacts(SAMPLE_CONTACTS, 'all', 'cliff')).toEqual([]);
  });
});

describe('filterOutreachLeads', () => {
  it('returns only Lead records and supports searching by city or name', () => {
    expect(filterOutreachLeads(SAMPLE_CONTACTS, '').map((c) => c.id)).toEqual(['l1', 'l2']);
    expect(filterOutreachLeads(SAMPLE_CONTACTS, 'balm').map((c) => c.id)).toEqual(['l2']);
  });
});

describe('filterEstimateClientCandidates', () => {
  it('excludes Vendors and Outreach Leads by default so Estimates stay clean', () => {
    expect(filterEstimateClientCandidates(SAMPLE_CONTACTS, '').map((c) => c.id)).toEqual(['c1']);
  });

  it('allows opting in to Outreach Leads when explicitly toggled', () => {
    expect(filterEstimateClientCandidates(SAMPLE_CONTACTS, '', true).map((c) => c.id)).toEqual([
      'c1',
      'l2',
      'l1',
    ]);
  });
});
