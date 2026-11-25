export interface FilterableContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  type: string | null;
  status: string | null;
}

export type DirectoryTab = 'Client' | 'Vendor' | 'all';

function matchesQuery(c: FilterableContact, q: string): boolean {
  if (!q) return true;
  return (
    c.name.toLowerCase().includes(q) ||
    (c.email || '').toLowerCase().includes(q) ||
    (c.notes || '').toLowerCase().includes(q) ||
    (c.address || '').toLowerCase().includes(q)
  );
}

/**
 * Contacts & Directory only includes active Clients and Vendors (Outreach Leads live in /outreach).
 */
export function filterDirectoryContacts<T extends FilterableContact>(
  contacts: T[],
  tab: DirectoryTab,
  searchTerm: string,
): T[] {
  const q = searchTerm.trim().toLowerCase();
  return contacts.filter((c) => {
    if (c.type === 'Lead') return false;
    if (!matchesQuery(c, q)) return false;
    if (tab === 'all') return true;
    return c.type === tab;
  });
}

/**
 * Outreach Hub only includes Leads (prospects).
 */
export function filterOutreachLeads<T extends FilterableContact>(
  contacts: T[],
  searchTerm: string,
): T[] {
  const q = searchTerm.trim().toLowerCase();
  return contacts.filter((c) => c.type === 'Lead' && matchesQuery(c, q));
}

/**
 * Estimate Client Picker defaults to Clients only (excludes Vendors and cold Outreach Leads),
 * with an optional opt-in toggle to include Outreach Leads when needed.
 */
export function filterEstimateClientCandidates<T extends FilterableContact>(
  contacts: T[],
  searchTerm: string,
  includeOutreachLeads = false,
): T[] {
  const q = searchTerm.trim().toLowerCase();
  return contacts
    .filter((c) => c.type !== 'Vendor')
    .filter((c) => includeOutreachLeads || c.type !== 'Lead')
    .filter((c) => matchesQuery(c, q))
    .sort((a, b) => {
      if (a.type === 'Client' && b.type !== 'Client') return -1;
      if (a.type !== 'Client' && b.type === 'Client') return 1;
      return a.name.localeCompare(b.name);
    });
}
