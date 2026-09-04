import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import { ThemeProvider } from "./theme";
import { LoginPage } from "./auth/LoginPage";
import { Layout } from "./components/Layout";
import { Spinner } from "./components/UI";
import { AthleteLayout } from "./pages/athlete/AthleteLayout";
import { CalendarioTab } from "./pages/athlete/CalendarioTab";
import { EstadisticasTab } from "./pages/athlete/EstadisticasTab";
import { FichaTab } from "./pages/athlete/FichaTab";
import { ProgramaTab } from "./pages/athlete/ProgramaTab";
import { ResumenTab } from "./pages/athlete/ResumenTab";
import { AthletesPage } from "./pages/AthletesPage";
import { BlockPage } from "./pages/BlockPage";
import { HomePage } from "./pages/HomePage";
import { InvitePage } from "./pages/InvitePage";
import { LibraryPage } from "./pages/LibraryPage";
import { SettingsPage } from "./pages/SettingsPage";

const qc = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Rutas />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function Rutas() {
  const { session, cargando } = useAuth();

  // El enlace de invitacion se abre SIN cuenta: va antes que el login.
  if (window.location.pathname.startsWith("/invitar/"))
    return (
      <Routes>
        <Route path="/invitar/:token" element={<InvitePage />} />
      </Routes>
    );

  if (cargando) return <Spinner label="Cargando…" />;
  if (!session) return <LoginPage />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="/atletas" element={<AthletesPage />} />
        <Route path="/atletas/:athleteId" element={<AthleteLayout />}>
          <Route index element={<ResumenTab />} />
          <Route path="programa" element={<ProgramaTab />} />
          <Route path="calendario" element={<CalendarioTab />} />
          <Route path="estadisticas" element={<EstadisticasTab />} />
          <Route path="ficha" element={<FichaTab />} />
        </Route>
        <Route path="/bloques/:blockId" element={<BlockPage />} />
        <Route path="/biblioteca" element={<LibraryPage />} />
        <Route path="/ajustes" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
