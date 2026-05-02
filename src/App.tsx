import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AIAssistantProvider } from "@/contexts/AIAssistantContext";
import AppLayout from "./components/AppLayout";
import Index from "./pages/Index";
import Contacts from "./pages/Contacts";
import ContactDetail from "./pages/ContactDetail";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Estimates from "./pages/Estimates";
import EstimateDetail from "./pages/EstimateDetail";
import EstimateCreate from "./pages/EstimateCreate";
import Invoices from "./pages/Invoices";
import InvoiceDetail from "./pages/InvoiceDetail";
import Receipts from "./pages/Receipts";
import Systems from "./pages/Systems";
import TaxSummary from "./pages/TaxSummary";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/contacts/:id" element={<ContactDetail />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/estimates" element={<Estimates />} />
        <Route path="/estimates/new" element={<EstimateCreate />} />
        <Route path="/estimates/:id" element={<EstimateDetail />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/invoices/:id" element={<InvoiceDetail />} />
        <Route path="/receipts" element={<Receipts />} />
        <Route path="/systems" element={<Systems />} />
        <Route path="/reports/tax" element={<TaxSummary />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster position="top-right" closeButton />
      <BrowserRouter>
        <AuthProvider>
          <AIAssistantProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/*" element={<ProtectedRoutes />} />
            </Routes>
          </AIAssistantProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
