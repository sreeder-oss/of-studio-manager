import { recomputeInvoiceFromLedger, localToday } from '@/hooks/useInvoicePayments';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSaveSystem } from './useSystems';
import { useSaveContact } from './useContacts';
import { useSaveProject } from './useProjects';
import { useSaveReceipt } from './useReceipts';
import { useQueryClient } from '@tanstack/react-query';
import type { AIAction } from '@/lib/actionSchema';
import { isJunkBusinessEmail, normalizeLeadName, normalizeLeadPhone } from '@/lib/leadSync';

export const useAIActions = () => {
  const navigate = useNavigate();
  const saveSystem = useSaveSystem();
  const saveContact = useSaveContact();
  const saveProject = useSaveProject();
  const saveReceipt = useSaveReceipt();
  const queryClient = useQueryClient();

  const run = useCallback(async (action: AIAction): Promise<boolean> => {
    try {
      switch (action.type) {
        case 'add_system': {
          const d = action.data;
          await saveSystem.mutateAsync({
            name: d.name,
            manufacturer: d.manufacturer ?? null,
            description: d.description ?? null,
            coats: d.coats ?? null,
            coverage_rate: d.coverage_rate ?? null,
            coverage_unit: d.coverage_unit ?? null,
            cost_per_unit: d.cost_per_unit ?? null,
            labor_rate_per_sf: d.labor_rate_per_sf ?? null,
            typical_equipment: d.typical_equipment ?? null,
            substrate_notes: d.substrate_notes ?? null,
            application_notes: d.application_notes ?? null,
            is_active: true,
          });
          toast.success(`Added system: ${d.name}`);
          return true;
        }
        case 'update_system': {
          const d = action.data;
          await saveSystem.mutateAsync({
            id: d.id,
            name: d.name ?? '',
            manufacturer: d.manufacturer ?? undefined,
            description: d.description ?? undefined,
            coats: d.coats ?? undefined,
            coverage_rate: d.coverage_rate ?? undefined,
            coverage_unit: d.coverage_unit ?? undefined,
            cost_per_unit: d.cost_per_unit ?? undefined,
            labor_rate_per_sf: d.labor_rate_per_sf ?? undefined,
            typical_equipment: d.typical_equipment ?? undefined,
            substrate_notes: d.substrate_notes ?? undefined,
            application_notes: d.application_notes ?? undefined,
          });
          toast.success('System updated');
          return true;
        }
        case 'create_contact': {
          const d = action.data;
          const cleanEmail = d.email && !isJunkBusinessEmail(d.email) ? d.email.trim() : null;
          const blockedJunk = Boolean(d.email && !cleanEmail);

          // Deduplicate against existing contacts by normalized company name or phone
          const { data: existingRows } = await supabase
            .from('contacts')
            .select('id, name, email, phone, address, notes, type, status');
          const nameKey = normalizeLeadName(d.name);
          const phoneKey = normalizeLeadPhone(d.phone);
          const isBranch = /—/.test(d.name);
          const existing = (existingRows || []).find(
            (c) =>
              (nameKey && normalizeLeadName(c.name) === nameKey) ||
              (!isBranch && phoneKey && normalizeLeadPhone(c.phone) === phoneKey),
          );

          if (existing) {
            const existingEmailBad = !existing.email || isJunkBusinessEmail(existing.email);
            const nextEmail = existingEmailBad && cleanEmail ? cleanEmail : existing.email;
            const nextPhone = existing.phone || d.phone || null;
            const nextAddress =
              d.address && (!existing.address || d.address.length > existing.address.length + 5)
                ? d.address
                : existing.address;
            const nextNotes =
              d.notes && !(existing.notes || '').includes(d.notes)
                ? existing.notes
                  ? `${existing.notes}\n${d.notes}`
                  : d.notes
                : existing.notes;
            await saveContact.mutateAsync({
              id: existing.id,
              name: existing.name,
              type: existing.type ?? d.type ?? 'Lead',
              status: existing.status ?? d.status ?? 'Pending',
              email: nextEmail,
              phone: nextPhone,
              address: nextAddress,
              notes: nextNotes ?? null,
            });
            toast.success(`Merged into existing contact: ${existing.name}${blockedJunk ? ' (blocked junk email)' : ''}`);
            return true;
          }

          await saveContact.mutateAsync({
            name: d.name,
            type: d.type ?? null,
            status: d.status ?? null,
            email: cleanEmail,
            phone: d.phone ?? null,
            address: d.address ?? null,
            notes: d.notes ?? null,
          });
          toast.success(`Created contact: ${d.name}${blockedJunk ? ' (blocked junk email)' : ''}`);
          return true;
        }
        case 'update_contact': {
          const d = action.data;
          const cleanEmail = d.email && !isJunkBusinessEmail(d.email) ? d.email.trim() : null;
          await saveContact.mutateAsync({
            id: d.id,
            name: d.name ?? '',
            type: d.type ?? null,
            status: d.status ?? null,
            email: cleanEmail,
            phone: d.phone ?? null,
            address: d.address ?? null,
            notes: d.notes ?? null,
          });
          toast.success('Contact updated');
          return true;
        }
        case 'create_project': {
          const d = action.data;
          await saveProject.mutateAsync({
            name: d.name,
            contact_id: d.contact_id ?? null,
            status: d.status ?? 'Active',
            address: d.address ?? null,
            start_date: d.start_date ?? null,
            end_date: d.end_date ?? null,
            contract_value: d.contract_value ?? null,
            notes: d.notes ?? null,
          });
          toast.success(`Created project: ${d.name}`);
          return true;
        }
        case 'create_receipt': {
          const d = action.data;
          await saveReceipt.mutateAsync({
            vendor: d.vendor ?? null,
            amount: d.amount,
            receipt_date: d.receipt_date,
            category: d.category ?? 'Materials',
            project_id: d.project_id ?? null,
            tax_deductible: d.tax_deductible ?? true,
            notes: d.notes ?? null,
            image_url: null,
          });
          toast.success(`Logged $${d.amount.toFixed(2)} receipt`);
          return true;
        }
        case 'mark_payment_received': {
          const d = action.data;
          const { data: inv, error } = await supabase
            .from('invoices').select('*').eq('id', d.invoice_id).single();
          if (error || !inv) throw error ?? new Error('Invoice not found');
          const remaining = +(Number(inv.total || 0) - Number(inv.deposit_applied || 0) - Number(inv.amount_paid || 0)).toFixed(2);
          if (!(remaining > 0)) { toast.info('Invoice is already paid in full'); return true; }
          const { error: payErr } = await supabase.from('invoice_payments').insert({
            invoice_id: d.invoice_id, amount: remaining,
            paid_on: d.paid_date ?? localToday(), method: null, note: 'Recorded by AI assistant',
          });
          if (payErr) throw payErr;
          await recomputeInvoiceFromLedger(d.invoice_id);
          await queryClient.invalidateQueries({ queryKey: ['invoice_payments', d.invoice_id] });
          await queryClient.invalidateQueries({ queryKey: ['invoices'] });
          toast.success('Marked invoice as paid');
          return true;
        }
        case 'query_tax_summary': {
          navigate(`/reports/tax?year=${encodeURIComponent(action.data.year)}`);
          return true;
        }
      }
    } catch (e) {
      console.error('AI action failed', e);
      toast.error('Could not apply action');
      return false;
    }
    return false;
  }, [navigate, saveSystem, saveContact, saveProject, saveReceipt, queryClient]);

  return { run };
};
