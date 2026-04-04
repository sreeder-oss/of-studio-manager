// Types are now primarily driven by the database schema.
// See src/integrations/supabase/types.ts for auto-generated DB types.
// These are kept for backwards compatibility / convenience re-exports.

export type ReceiptCategory = 'Materials' | 'Labor' | 'Equipment' | 'Travel' | 'Supplies' | 'Miscellaneous';

export const RECEIPT_CATEGORIES: { value: ReceiptCategory; label: string }[] = [
  { value: 'Materials', label: 'Materials' },
  { value: 'Labor', label: 'Labor' },
  { value: 'Equipment', label: 'Equipment' },
  { value: 'Travel', label: 'Travel' },
  { value: 'Supplies', label: 'Supplies' },
  { value: 'Miscellaneous', label: 'Miscellaneous' },
];
