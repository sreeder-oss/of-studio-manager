import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import Index from "./pages/Index";
import Contacts from "./pages/Contacts";
import Estimates from "./pages/Estimates";
import Invoices from "./pages/Invoices";
import Receipts from "./pages/Receipts";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";
import { seedData } from "./services/storage";

const queryClient = new QueryClient();

const AppContent = () => {
  useEffect(() => { seedData(); }, []);
  
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/estimates" element={<Estimates />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/receipts" element={<Receipts />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
