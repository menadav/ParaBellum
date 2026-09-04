import { NavLink, Outlet, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { iniciales } from "../../components/Sidebar";
import { ErrorBox, Spinner, StatusPill } from "../../components/UI";
import "./athlete.css";

const PESTANAS = [
  { to: "", label: "Resumen", end: true },
  { to: "programa", label: "Programa" },
  { to: "calendario", label: "Calendario" },
  { to: "estadisticas", label: "Estadísticas" },
  { to: "ficha", label: "Ficha" },
];

export function AthleteLayout() {
  const { athleteId = "" } = useParams();

  const { data: atletas, isLoading, error } = useQuery({
    queryKey: ["atletas"],
    queryFn: api.athletes,
  });

  if (isLoading) return <Spinner label="Cargando…" />;
  if (error) return <ErrorBox error={error} />;

  const atleta = atletas?.find((a) => a.id === athleteId);
  if (!atleta)
    return <ErrorBox error={new Error("Ese atleta no está a tu cargo")} />;

  return (
    <div className="page">
      <div className="page-head">
        <div className="row" style={{ gap: "var(--sp-4)" }}>
          <span className="avatar grande">{iniciales(atleta.name)}</span>
          <div className="page-title">
            <div className="row" style={{ gap: "var(--sp-3)" }}>
              <h1>{atleta.name}</h1>
              <StatusPill status={atleta.status} />
            </div>
            <p>{atleta.email}</p>
          </div>
        </div>
      </div>

      <nav className="pestanas">
        {PESTANAS.map((p) => (
          <NavLink key={p.to} to={p.to} end={p.end}>
            {p.label}
          </NavLink>
        ))}
      </nav>

      <Outlet context={atleta} />
    </div>
  );
}
