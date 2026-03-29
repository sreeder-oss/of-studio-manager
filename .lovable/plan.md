

# Receipts Organized by Project

## What Changes

Currently, receipts are categorized by expense type (Materials, Labor, etc.) but have no project association. You want to snap a photo on your phone and file it under a specific project/job.

## Plan

### 1. Add Project concept to types
- Add a `Project` interface with id, name, contactId, status, color
- Add `projectId` field to the `Receipt` type
- Add project CRUD to storage service

### 2. Create a Projects management section
- Simple project list derived from your existing estimates/contacts (e.g., "Sarah Mitchell — Kitchen Renovation")
- Quick-add project from the receipt form
- Projects stored in localStorage alongside other data

### 3. Update Receipt form with project picker
- Add a "Project" dropdown to the Add Receipt modal (above category)
- Camera and Upload buttons remain — these already use `capture="environment"` which opens the phone camera natively
- Each receipt gets tagged to a project

### 4. Reorganize Receipts view by project
- Default view groups receipts under project headers (collapsible)
- Each project section shows its total spend
- Keep the existing category filter chips — they filter within/across projects
- Add a "By Category" / "By Project" toggle for the list view
- Unassigned receipts appear under a "General" section

### 5. Update exports
- Export filters by project so you can pull all receipts for one job
- CSV/PDF include project name column

## Technical Details

**Files modified:**
- `src/types/index.ts` — add `Project` interface, update `Receipt` with optional `projectId`
- `src/services/storage.ts` — add project CRUD, seed sample projects from existing estimates
- `src/pages/Receipts.tsx` — add project picker in form, grouped list view, project filter

**Files created:**
- None needed; all changes fit in existing files

**Camera behavior:** The existing `<input capture="environment">` already triggers the phone camera. No additional camera API needed — this works on both iOS and Android PWAs.

