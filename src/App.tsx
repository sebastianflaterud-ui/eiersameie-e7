import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Transaksjoner from "./pages/Transaksjoner";
import Import from "./pages/Import";
import Datavasking from "./pages/Datavasking";
import Enheter from "./pages/Enheter";
import LeietakerePage from "./pages/LeietakerePage";

import Kontrakter from "./pages/Kontrakter";
import Beleggsoversikt from "./pages/Beleggsoversikt";
import Kalender from "./pages/Kalender";
import Leieinntekter from "./pages/Leieinntekter";
import Eiersameie from "./pages/Eiersameie";
import Eiere from "./pages/Eiere";
import Abonnementer from "./pages/Abonnementer";
import Skatt from "./pages/Skatt";
import Regler from "./pages/Regler";
import Kontoer from "./pages/Kontoer";
import Chat from "./pages/Chat";
import Mellomvaerende from "./pages/Mellomvaerende";
import Investeringer from "./pages/Investeringer";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Laster...</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/transaksjoner" element={<Transaksjoner />} />
        <Route path="/import" element={<Import />} />
        <Route path="/datavasking" element={<Datavasking />} />
        <Route path="/enheter" element={<Enheter />} />
        
        <Route path="/kontrakter" element={<Kontrakter />} />
        <Route path="/belegg" element={<Beleggsoversikt />} />
        <Route path="/kalender" element={<Kalender />} />
        <Route path="/leieinntekter" element={<Leieinntekter />} />
        <Route path="/eiersameie" element={<Eiersameie />} />
        <Route path="/eiere" element={<Eiere />} />
        <Route path="/mellomvaerende" element={<Mellomvaerende />} />
        <Route path="/investeringer" element={<Investeringer />} />
        <Route path="/abonnementer" element={<Abonnementer />} />
        <Route path="/skatt" element={<Skatt />} />
        <Route path="/regler" element={<Regler />} />
        <Route path="/kontoer" element={<Kontoer />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

function AuthGate() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Laster...</p>
      </div>
    );
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  return <Auth />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthGate />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
