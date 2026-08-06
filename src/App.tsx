import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Suspense, lazy } from "react";

const AuthPage = lazy(() => import("./pages/AuthPage"));
const KanbanPage = lazy(() => import("./pages/KanbanPage"));
const MeuDiaPage = lazy(() => import("./pages/MeuDiaPage"));
const GanttPage = lazy(() => import("./pages/GanttPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const PanoramicPage = lazy(() => import("./pages/PanoramicPage"));
const SolicitacoesPage = lazy(() => import("./pages/SolicitacoesPage"));
const ConfiguracoesPage = lazy(() => import("./pages/ConfiguracoesPage"));
const EquipePage = lazy(() => import("./pages/EquipePage"));
const EquipesPage = lazy(() => import("./pages/EquipesPage"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const ProjectDetailPage = lazy(() => import("./pages/ProjectDetailPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  if (profile?.role !== "admin") {
    return <Navigate to="/meu-dia" replace />;
  }
  return <>{children}</>;
}

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<KanbanPage />} />
        <Route path="/meu-dia" element={<MeuDiaPage />} />
        <Route path="/gantt" element={<GanttPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/panoramica" element={<PanoramicPage />} />
        <Route path="/solicitacoes" element={<SolicitacoesPage />} />
        
        {/* Admin Routes */}
        <Route path="/equipe" element={<AdminRoute><EquipePage /></AdminRoute>} />
        <Route path="/equipes" element={<AdminRoute><EquipesPage /></AdminRoute>} />
        <Route path="/projetos" element={<AdminRoute><ProjectsPage /></AdminRoute>} />
        <Route path="/projetos/:projectId" element={<AdminRoute><ProjectDetailPage /></AdminRoute>} />
        <Route path="/configuracoes" element={<AdminRoute><ConfiguracoesPage /></AdminRoute>} />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
