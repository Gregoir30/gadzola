import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrandingProvider } from "@/contexts/BrandingContext";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCollecteurs from "./pages/admin/AdminCollecteurs";
import AdminClients from "./pages/admin/AdminClients";
import AdminTransactions from "./pages/admin/AdminTransactions";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminLeaderboard from "./pages/admin/AdminLeaderboard";
import AdminSettings from "./pages/admin/AdminSettings";

import CollecteurDashboard from "./pages/collecteur/CollecteurDashboard";
import Encaisser from "./pages/collecteur/Encaisser";
import CollecteurHistorique from "./pages/collecteur/CollecteurHistorique";

import ClientDashboard from "./pages/client/ClientDashboard";
import ClientTransactions from "./pages/client/ClientTransactions";
import ClientPayer from "./pages/client/ClientPayer";
import ClientCarnet from "./pages/client/ClientCarnet";
import Profile from "./pages/Profile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrandingProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />

            {/* Admin */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/collecteurs"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminCollecteurs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/clients"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminClients />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/transactions"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminTransactions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/notifications"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminNotifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/leaderboard"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminLeaderboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminSettings />
                </ProtectedRoute>
              }
            />

            {/* Collecteur */}
            <Route
              path="/collecteur"
              element={
                <ProtectedRoute allowedRoles={["collecteur", "admin"]}>
                  <CollecteurDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/collecteur/encaisser"
              element={
                <ProtectedRoute allowedRoles={["collecteur", "admin"]}>
                  <Encaisser />
                </ProtectedRoute>
              }
            />
            <Route
              path="/collecteur/historique"
              element={
                <ProtectedRoute allowedRoles={["collecteur", "admin"]}>
                  <CollecteurHistorique />
                </ProtectedRoute>
              }
            />

            {/* Client */}
            <Route
              path="/client"
              element={
                <ProtectedRoute allowedRoles={["client"]}>
                  <ClientDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/client/carnet"
              element={
                <ProtectedRoute allowedRoles={["client"]}>
                  <ClientCarnet />
                </ProtectedRoute>
              }
            />
            <Route
              path="/client/transactions"
              element={
                <ProtectedRoute allowedRoles={["client"]}>
                  <ClientTransactions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/client/payer"
              element={
                <ProtectedRoute allowedRoles={["client"]}>
                  <ClientPayer />
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </BrandingProvider>
  </QueryClientProvider>
);

export default App;
