import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Icon } from "../components/Icon";
import { EmptyState, ErrorBox, Spinner } from "../components/UI";

export function LibraryPage() {
  const [q, setQ] = useState("");
  const [grupo, setGrupo] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["catalogo", q, grupo],
    queryFn: () => api.catalog(q, grupo ?? undefined),
  });

  const ejercicios = data ?? [];
  const grupos = [
    ...new Set(ejercicios.map((e) => e.muscle_group).filter(Boolean)),
  ] as string[];

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-title">
          <h1>Biblioteca</h1>
          <p>Tu catálogo de ejercicios, más los globales</p>
        </div>
      </div>

      <div className="row" style={{ gap: "var(--sp-3)", flexWrap: "wrap" }}>
        <div
          className="sidebar-search"
          style={{ margin: 0, minWidth: 260, flex: 1, maxWidth: 380 }}
        >
          <Icon name="search" size={15} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar ejercicio"
          />
        </div>
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          <button
            className={`dia-btn ${grupo === null ? "on" : ""}`}
            onClick={() => setGrupo(null)}
          >
            Todos
          </button>
          {grupos.map((g) => (
            <button
              key={g}
              className={`dia-btn ${grupo === g ? "on" : ""}`}
              onClick={() => setGrupo(g)}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <section className="card">
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <div className="card-body">
            <ErrorBox error={error} />
          </div>
        ) : ejercicios.length === 0 ? (
          <EmptyState
            icon="folder"
            title="Sin ejercicios"
            text="El catálogo se rellena desde la API mientras no exista el formulario de alta."
          />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Ejercicio</th>
                <th>Grupo muscular</th>
                <th>Origen</th>
              </tr>
            </thead>
            <tbody>
              {ejercicios.map((e) => (
                <tr key={e.id}>
                  <td>
                    <strong>{e.name}</strong>
                    <div className="muted celda-meta">{e.explanation}</div>
                  </td>
                  <td className="muted">{e.muscle_group ?? "—"}</td>
                  <td>
                    <span className="pill">
                      {e.coach_id ? "Tuyo" : "Global"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
