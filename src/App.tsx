import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, MutationCache } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDbError } from "@/lib/formatDbError";
import React, { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AIAssistantProvider } from "@/contexts/AIAssistantContext";
import { AIContextProvider } from "@/contexts/AIContextProvider";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "./components/AppLayout";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { Suspense, lazy } from "react";

const Index = lazy(() => import("./pages/Index"));
const Settings = lazy(() => import("./pages/Settings"));
const Contacts = lazy(() => import("./pages/Contacts"));
const Outreach = lazy(() => import("./pages/Outreach"));
const ContactDetail = lazy(() => import("./pages/ContactDetail"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const Estimates = lazy(() => import("./pages/Estimates"));
const EstimateDetail = lazy(() => import("./pages/EstimateDetail"));
const EstimateCreate = lazy(() => import("./pages/EstimateCreate"));
const Invoices = lazy(() => import("./pages/Invoices"));
const InvoiceDetail = lazy(() => import("./pages/InvoiceDetail"));
const Receipts = lazy(() => import("./pages/Receipts"));
const Systems = lazy(() => import("./pages/Systems"));
const Services = lazy(() => import("./pages/Services"));
const Visualizer = lazy(() => import("./pages/Visualizer"));
const TaxSummary = lazy(() => import("./pages/TaxSummary"));
const Login = lazy(() => import("./pages/Login"));
const NotFound = lazy(() => import("./pages/NotFound"));

const RouteFallback = () => (
  <div className="min-h-[40vh] flex items-center justify-center">
    <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      if ((mutation.meta as any)?.suppressErrorToast) return;
      toast.error(formatDbError(error as any));
    },
  }),
});

const RequireAuth: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <AIAssistantProvider>
      <AIContextProvider>
        <Outlet />
      </AIContextProvider>
    </AIAssistantProvider>
  );
};

const SignedOutToastListener: React.FC = () => {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        toast.message('Signed out');
      }
      if (event === 'TOKEN_REFRESHED') {
        // silent
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster position="top-right" closeButton />
      <BrowserRouter>
        <AuthProvider>
          <SignedOutToastListener />
          <AppErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route element={<RequireAuth />}>
                  <Route element={<AppLayout />}>
                    <Route path="/" element={<Index />} />
                    <Route path="/contacts" element={<Contacts />} />
                    <Route path="/outreach" element={<Outreach />} />
                    <Route path="/contacts/:id" element={<ContactDetail />} />
                    <Route path="/projects" element={<Projects />} />
                    <Route path="/projects/:id" element={<ProjectDetail />} />
                    <Route path="/estimates" element={<Estimates />} />
                    <Route path="/estimates/new" element={<EstimateCreate />} />
                    <Route path="/estimates/:id/edit" element={<EstimateCreate />} />
                    <Route path="/estimates/:id" element={<EstimateDetail />} />
                    <Route path="/invoices" element={<Invoices />} />
                    <Route path="/invoices/:id" element={<InvoiceDetail />} />
                    <Route path="/receipts" element={<Receipts />} />
                    <Route path="/services" element={<Services />} />
                    <Route path="/systems" element={<Systems />} />
                    <Route path="/visualizer" element={<Visualizer />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/reports/tax" element={<TaxSummary />} />
                  </Route>
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AppErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
