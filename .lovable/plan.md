

# Organic Finishes — Business Management App

Rebuilding your AI Studio app in Lovable with the same dark, matte branding (plum/dark surface with green accents and beige text) plus a brand-new Receipt Scanner feature.

---

## Phase 1: Core App Foundation & Branding

- **Design system** matching your existing dark brand: plum backgrounds (#362f3d), matte surface cards (#433b4d), green primary (#69B06E), beige text (#e8e3d6)
- **App layout** with bottom navigation (Dashboard, Contacts, Estimates, Invoices, Receipts)
- DM Serif Display + Inter font pairing

## Phase 2: Dashboard

- Navigation cards to each section (Contacts, Estimates, Invoices, Receipts)
- Quick summary stats (outstanding invoices, recent activity)

## Phase 3: Contacts Management

- Contact list with search and category filters (Client, Lead, Vendor)
- Add/edit/delete contacts with name, email, phone, address, notes
- Status badges (Active, Inactive, Pending)

## Phase 4: Estimates

- Create estimates by selecting a client, adding line items (scope, materials, amount)
- Auto-calculate subtotal, tax, total, and 50% deposit
- Estimate status tracking (Pending, Approved, Declined)
- Convert approved estimates to invoices
- Export/share estimate as image

## Phase 5: Invoices

- Invoice list with paid/unpaid/overdue status tracking
- Summary cards showing total paid vs. outstanding
- Link invoices to estimates

## Phase 6: Receipt Scanner (New Feature)

- **Camera capture**: Open device camera to photograph receipts directly in the app
- **Image upload**: Alternative option to upload from photo library
- **Receipt storage**: Images saved securely via Lovable Cloud storage
- **Categorization**: Organize receipts into default expense categories — Materials, Labor, Equipment, Travel, Supplies, Miscellaneous
- **Receipt details**: Date, vendor/store name, amount, category, and optional notes for each receipt
- **Search & filter**: Find receipts by date range, category, or vendor

## Phase 7: Tax Export

- **CSV/Excel export**: All receipts exported with date, vendor, amount, category — compatible with QuickBooks, Wave, Excel
- **QBO format**: QuickBooks-specific import file
- **PDF report**: Formatted expense summary grouped by category with totals
- Filter exports by date range (e.g., tax year, quarter)

## Phase 8: Backend (Lovable Cloud)

- Database tables for contacts, estimates, invoices, and receipts
- Secure file storage for receipt images
- Data persists across sessions and devices

