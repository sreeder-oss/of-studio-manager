import { useCallback } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSaveSystem } from './useSystems';
import { useSaveContact } from './useContacts';
import { useSaveProject } from './useProjects';
import { useSaveReceipt } from './useReceipts';
import { useSaveInvoice } from './useInvoices';
import type { AIAction } from '@/lib/actionSchema';

export const useAIActions = () => {
  const navigate = useNavigate();
  const saveSystem = useSaveSystem();
  const saveContact = useSaveContact();
  const saveProject = useSaveProject();
  const saveReceipt = useSaveReceipt();
  const saveInvoice = useSaveInvoice();

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
          await saveContact.mutateAsync({
            name: d.name,
            type: d.type ?? null,
            status: d.status ?? null,
            email: d.email ?? null,
            phone: d.phone ?? null,
            address: d.address ?? null,
            notes: d.notes ?? null,
          });
          toast.success(`Created contact: ${d.name}`);
          return true;
        }
        case 'update_contact': {
          const d = action.data;
          await saveContact.mutateAsync({
            id: d.id,
            name: d.name ?? '',
            type: d.type ?? null,
            status: d.status ?? null,
            email: d.email ?? null,
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
          await saveInvoice.mutateAsync({
            id: d.invoice_id,
            contact_id: inv.contact_id,
            project_id: inv.project_id,
            estimate_id: inv.estimate_id,
            line_items: inv.line_items,
            subtotal: inv.subtotal,
            tax_applied: inv.tax_applied,
            total: inv.total,
            due_date: inv.due_date,
            paid: true,
            paid_date: d.paid_date ?? new Date().toISOString().slice(0, 10),
          });
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
  }, [navigate, saveSystem, saveContact, saveProject, saveReceipt, saveInvoice]);

  return { run };
};
