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
import { LegalPage } from "./pages/legal/LegalPage";
import { DOCUMENTOS } from "./pages/legal/textos";
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

  // Se abren SIN cuenta: la invitacion, y los textos legales. Un atleta
  // que se lo esta pensando, o la AEPD mirando una reclamacion, no van a
  // registrarse para leerlos. Se registran las tres paginas siempre, no
  // solo la que coincide al entrar, o no se puede navegar entre ellas.
  const publicas = [
    <Route key="invitar" path="/invitar/:token" element={<InvitePage />} />,
    ...DOCUMENTOS.map((d) => (
      <Route
        key={d.ruta}
        path={d.ruta}
        element={<LegalPage documento={d} />}
      />
    )),
  ];

  if (cargando)
    return (
      <Routes>
        {publicas}
        <Route path="*" element={<Spinner label="Cargando…" />} />
      </Routes>
    );

  if (!session)
    return (
      <Routes>
        {publicas}
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );

  return (
    <Routes>
      {publicas}
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

