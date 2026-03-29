import { Contact, Estimate, Invoice, Receipt, Project } from '@/types';

const KEYS = {
  contacts: 'of_contacts',
  estimates: 'of_estimates',
  invoices: 'of_invoices',
  receipts: 'of_receipts',
  projects: 'of_projects',
};

function getItems<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

function setItems<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items));
}

// Contacts
export const getContacts = (): Contact[] => getItems<Contact>(KEYS.contacts);
export const saveContact = (contact: Contact): void => {
  const contacts = getContacts();
  const idx = contacts.findIndex(c => c.id === contact.id);
  if (idx >= 0) contacts[idx] = contact;
  else contacts.push(contact);
  setItems(KEYS.contacts, contacts);
};
export const deleteContact = (id: string): void => {
  setItems(KEYS.contacts, getContacts().filter(c => c.id !== id));
};

// Estimates
export const getEstimates = (): Estimate[] => getItems<Estimate>(KEYS.estimates);
export const saveEstimate = (estimate: Estimate): void => {
  const estimates = getEstimates();
  const idx = estimates.findIndex(e => e.id === estimate.id);
  if (idx >= 0) estimates[idx] = estimate;
  else estimates.push(estimate);
  setItems(KEYS.estimates, estimates);
};
export const deleteEstimate = (id: string): void => {
  setItems(KEYS.estimates, getEstimates().filter(e => e.id !== id));
};

// Invoices
export const getInvoices = (): Invoice[] => getItems<Invoice>(KEYS.invoices);
export const saveInvoice = (invoice: Invoice): void => {
  const invoices = getInvoices();
  const idx = invoices.findIndex(i => i.id === invoice.id);
  if (idx >= 0) invoices[idx] = invoice;
  else invoices.push(invoice);
  setItems(KEYS.invoices, invoices);
};

// Receipts
export const getReceipts = (): Receipt[] => getItems<Receipt>(KEYS.receipts);
export const saveReceipt = (receipt: Receipt): void => {
  const receipts = getReceipts();
  const idx = receipts.findIndex(r => r.id === receipt.id);
  if (idx >= 0) receipts[idx] = receipt;
  else receipts.push(receipt);
  setItems(KEYS.receipts, receipts);
};
export const deleteReceipt = (id: string): void => {
  setItems(KEYS.receipts, getReceipts().filter(r => r.id !== id));
};

// Seed demo data
export const seedData = (): void => {
  if (getContacts().length > 0) return;
  
  const contacts: Contact[] = [
    { id: 'c-1', name: 'Sarah Mitchell', email: 'sarah@mitchell.com', phone: '(555) 123-4567', address: '123 Oak St', notes: 'Kitchen renovation project', category: 'client', status: 'active', createdAt: new Date().toISOString() },
    { id: 'c-2', name: 'James Porter', email: 'james@porter.io', phone: '(555) 987-6543', address: '456 Elm Ave', notes: 'Full home repaint', category: 'client', status: 'pending', createdAt: new Date().toISOString() },
    { id: 'c-3', name: 'ACE Hardware', email: 'orders@ace.com', phone: '(555) 111-2222', address: '789 Main St', notes: 'Primary paint supplier', category: 'vendor', status: 'active', createdAt: new Date().toISOString() },
  ];
  
  const estimates: Estimate[] = [
    { id: 'e-1', contactId: 'c-1', number: 'EST-2025-1001', items: [{ id: '1', description: 'Lime wash kitchen walls\nMaterials: Romabio Classico', scope: 'Lime wash kitchen walls', materials: 'Romabio Classico', amount: 2800 }], notes: '50% deposit required to schedule.', status: 'approved', date: '2025-01-15', taxRate: 0 },
    { id: 'e-2', contactId: 'c-2', number: 'EST-2025-1002', items: [{ id: '1', description: 'Interior repaint — 4 bedrooms\nMaterials: Benjamin Moore Aura', scope: 'Interior repaint — 4 bedrooms', materials: 'Benjamin Moore Aura', amount: 4200 }], notes: '50% deposit required to schedule.', status: 'pending', date: '2025-02-01', taxRate: 0 },
  ];

  const invoices: Invoice[] = [
    { id: 'i-1', estimateId: 'e-1', contactId: 'c-1', number: 'INV-2025-001', items: [{ id: '1', description: 'Lime wash kitchen walls', amount: 2800 }], notes: '', status: 'paid', date: '2025-01-20', dueDate: '2025-02-20', taxRate: 0 },
  ];

  setItems(KEYS.contacts, contacts);
  setItems(KEYS.estimates, estimates);
  setItems(KEYS.invoices, invoices);
};
