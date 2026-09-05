import { Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Avisos } from "./Avisos";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { ErrorBox, Spinner } from "./UI";
import "./layout.css";

export function Layout() {
  const { data: usuario, isLoading, error } = useQuery({
    queryKey: ["me"],
    queryFn: api.me,
    retry: 1,
  });

  if (isLoading) return <Spinner label="Cargando tu perfil…" />;
  if (error || !usuario)
    return (
      <div className="app-error">
        <ErrorBox error={error} />
        <p className="muted">
          Si la API acaba de despertarse, espera unos segundos y recarga.
        </p>
      </div>
    );

  return (
    <div className="app">
      <Sidebar usuario={usuario} />
      <main className="app-main">
        <TopBar usuario={usuario} />
        <Avisos />
        <Outlet context={usuario} />
      </main>
    </div>
  );
}
