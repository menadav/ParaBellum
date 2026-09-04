import { Link } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Block } from "../lib/types";
import { iniciales } from "../components/Sidebar";
import { EmptyState, ErrorBox, Spinner, StatusPill } from "../components/UI";
import "./athletes.css";

const DIAS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

export function AthletesPage() {
  const [atletasQ, bloquesQ] = useQueries({
    queries: [
      { queryKey: ["atletas"], queryFn: api.athletes },
      { queryKey: ["misBloques"], queryFn: api.myBlocks },
    ],
  });

  if (atletasQ.isLoading) return <Spinner label="Cargando atletas…" />;
  if (atletasQ.error) return <ErrorBox error={atletasQ.error} />;

  const atletas = atletasQ.data ?? [];
  const bloques = bloquesQ.data ?? [];
  const activoDe = new Map<string, Block>();
  for (const b of bloques) {
    if (b.status === "active") activoDe.set(b.athlete_id, b);
  }

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-title">
          <h1>Atletas</h1>
          <p>{atletas.length} en total</p>
        </div>
      </div>

      <section className="card">
        {atletas.length === 0 ? (
          <EmptyState
            icon="userPlus"
            title="Todavía no tienes atletas"
            text="Cuando un atleta se registre y lo asignes a tu cargo, aparecerá aquí."
          />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Atleta</th>
                  <th>Bloque</th>
                  <th className="dias-col">Días de entreno</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {atletas.map((a) => {
                  const bloque = activoDe.get(a.id);
                  return (
                    <tr key={a.id}>
                      <td>
                        <Link
                          to={`/atletas/${a.id}`}
                          className="row"
                          style={{ gap: "var(--sp-3)" }}
                        >
                          <span className="avatar">{iniciales(a.name)}</span>
                          <span className="stack">
                            <strong>{a.name}</strong>
                            <span className="muted celda-meta">{a.email}</span>
                          </span>
                        </Link>
                      </td>
                      <td>
                        {bloque ? (
                          <Link to={`/bloques/${bloque.id}`}>
                            {bloque.name}
                          </Link>
                        ) : (
                          <span className="muted">Sin bloque activo</span>
                        )}
                      </td>
                      <td>
                        <DiasEntreno blockId={bloque?.id} />
                      </td>
                      <td>
                        <StatusPill status={a.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function DiasEntreno({ blockId }: { blockId?: number }) {
  const [q] = useQueries({
    queries: [
      {
        queryKey: ["entrenos", blockId, 1],
        queryFn: () => api.workouts(blockId!, 1),
        enabled: blockId != null,
      },
    ],
  });
  const activos = new Set((q.data ?? []).map((w) => w.day_of_week));

  return (
    <div className="dias">
      {DIAS.map((d, i) => (
        <span key={d} className="dia">
          <span className="dia-label">{d}</span>
          <span className={`dia-punto ${activos.has(i as 0) ? "on" : ""}`} />
        </span>
      ))}
    </div>
  );
}
