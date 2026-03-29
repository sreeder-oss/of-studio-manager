export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  category: 'client' | 'lead' | 'vendor';
  status: 'active' | 'inactive' | 'estimate' | 'pending';
  createdAt: string;
}

export interface LineItem {
  id: string;
  description: string;
  amount: number;
  scope?: string;
  materials?: string;
}

export interface Estimate {
  id: string;
  contactId: string;
  number: string;
  items: LineItem[];
  notes: string;
  status: 'pending' | 'approved' | 'declined' | 'invoiced';
  date: string;
  taxRate?: number;
}

export interface Invoice {
  id: string;
  estimateId?: string;
  contactId: string;
  number: string;
  items: LineItem[];
  notes: string;
  status: 'unpaid' | 'paid';
  date: string;
  dueDate: string;
  taxRate?: number;
}

export interface Project {
  id: string;
  name: string;
  contactId?: string;
  status: 'active' | 'completed' | 'archived';
  color: string;
  createdAt: string;
}

export interface Receipt {
  id: string;
  imageUrl?: string;
  vendor: string;
  amount: number;
  date: string;
  category: ReceiptCategory;
  projectId?: string;
  notes: string;
  createdAt: string;
}

export type ReceiptCategory = 'materials' | 'labor' | 'equipment' | 'travel' | 'supplies' | 'miscellaneous';

export const RECEIPT_CATEGORIES: { value: ReceiptCategory; label: string }[] = [
  { value: 'materials', label: 'Materials' },
  { value: 'labor', label: 'Labor' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'travel', label: 'Travel' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'miscellaneous', label: 'Miscellaneous' },
];
