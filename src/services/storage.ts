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

// Projects
export const getProjects = (): Project[] => getItems<Project>(KEYS.projects);
export const saveProject = (project: Project): void => {
  const projects = getProjects();
  const idx = projects.findIndex(p => p.id === project.id);
  if (idx >= 0) projects[idx] = project;
  else projects.push(project);
  setItems(KEYS.projects, projects);
};
export const deleteProject = (id: string): void => {
  setItems(KEYS.projects, getProjects().filter(p => p.id !== id));
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

