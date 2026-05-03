import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { useAIAssistantOptional } from '@/contexts/AIAssistantContext';
import { AIChat } from './AIChat';

const useIsDesktop = () => {
  const [v, setV] = useState(typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setV(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return v;
};

export const AIAssistant: React.FC = () => {
  const ctx = useAIAssistantOptional();
  const isDesktop = useIsDesktop();
  if (!ctx) return null;
  const { open, setOpen } = ctx;

  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
          <div className="flex-1 overflow-hidden"><AIChat /></div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent className="h-[85vh] p-0 flex flex-col">
        <div className="flex-1 overflow-hidden"><AIChat /></div>
      </DrawerContent>
    </Drawer>
  );
};
