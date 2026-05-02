import { useCallback } from 'react';
import { toast } from 'sonner';
import { useSaveSystem } from './useSystems';
import type { AIAction } from '@/lib/actionSchema';

export const useAIActions = () => {
  const saveSystem = useSaveSystem();

  const run = useCallback(async (action: AIAction) => {
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
      }
    } catch (e) {
      console.error('AI action failed', e);
      toast.error('Could not apply action');
      return false;
    }
  }, [saveSystem]);

  return { run };
};
