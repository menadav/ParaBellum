import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { User } from "../lib/types";
import { Icon, type IconName } from "./Icon";
import { Monogram, Wordmark } from "./Brand";
import "./sidebar.css";

const NAV: { to: string; icon: IconName; label: string }[] = [
  { to: "/", icon: "home", label: "Inicio" },
  { to: "/atletas", icon: "users", label: "Atletas" },
  { to: "/biblioteca", icon: "folder", label: "Biblioteca" },
  { to: "/ajustes", icon: "settings", label: "Ajustes" },
];

export function Sidebar({ usuario }: { usuario: User }) {
  const [busqueda, setBusqueda] = useState("");
  const esCoach = usuario.role === "coach";

  const { data: atletas = [] } = useQuery({
    queryKey: ["atletas"],
    queryFn: api.athletes,
    enabled: esCoach,
  });

  const filtrados = atletas.filter((a) =>
    a.name.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Monogram size={26} />
        <Wordmark height={26} />
      </div>

      <nav className="sidebar-nav">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === "/"}>
            <Icon name={item.icon} size={17} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {esCoach && (
        <div className="sidebar-athletes">
          <div className="sidebar-search">
            <Icon name="search" size={15} />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar atletas"
              aria-label="Buscar atletas"
            />
          </div>

          <ul>
            {filtrados.map((a) => (
              <li key={a.id}>
                <NavLink to={`/atletas/${a.id}`}>
                  <span className="avatar">{iniciales(a.name)}</span>
                  <span className="stack">
                    <span className="sidebar-athlete-name">{a.name}</span>
                    <span className="sidebar-athlete-meta">{a.email}</span>
                  </span>
                </NavLink>
              </li>
            ))}
            {filtrados.length === 0 && (
              <li className="sidebar-vacio">
                {atletas.length === 0
                  ? "Todavía no tienes atletas"
                  : "Ningún atleta coincide"}
              </li>
            )}
          </ul>
        </div>
      )}

      <NavLink to="/ajustes" className="sidebar-yo">
        <span className="avatar">{iniciales(usuario.name)}</span>
        <span className="stack" style={{ minWidth: 0 }}>
          <span className="sidebar-athlete-name">{usuario.name}</span>
          <span className={`rol ${esCoach ? "coach" : "atleta"}`}>
            {esCoach ? "Entrenador" : "Atleta"}
          </span>
        </span>
      </NavLink>
    </aside>
  );
}

export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).slice(0, 2);
  return partes.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}
