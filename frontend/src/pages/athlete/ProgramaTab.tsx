import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { User } from "../../lib/types";
import { Icon } from "../../components/Icon";
import {
  EmptyState,
  ErrorBox,
  Spinner,
  StatusPill,
} from "../../components/UI";
import { formatoCorto } from "../HomePage";

export function ProgramaTab() {
  const atleta = useOutletContext<User>();
  const [creando, setCreando] = useState(false);

  const {
    data: bloques = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["bloquesAtleta", atleta.id],
    queryFn: () => api.athleteBlocks(atleta.id),
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBox error={error} />;

  return (
    <div className="stack" style={{ gap: "var(--sp-5)" }}>
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button className="btn" onClick={() => setCreando((v) => !v)}>
          <Icon name="plus" size={16} />
          Nuevo bloque
        </button>
      </div>

      {creando && (
        <NuevoBloque
          athleteId={atleta.id}
          onCerrar={() => setCreando(false)}
        />
      )}

      <section className="card">
        {bloques.length === 0 ? (
          <EmptyState
            icon="layers"
            title="Sin bloques todavía"
            text="Crea el primer bloque de entrenamiento para este atleta."
          />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Bloque</th>
                <th>Semanas</th>
                <th>Fechas</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {bloques.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link to={`/bloques/${b.id}`}>
                      <strong>{b.name}</strong>
                    </Link>
                  </td>
                  <td className="num">{b.total_weeks}</td>
                  <td className="muted">
                    {formatoCorto(new Date(b.start_date))} –{" "}
                    {formatoCorto(new Date(b.end_date))}
                  </td>
                  <td>
                    <StatusPill status={b.status} />
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

function NuevoBloque({
  athleteId,
  onCerrar,
}: {
  athleteId: string;
  onCerrar: () => void;
}) {
  const qc = useQueryClient();
  const [nombre, setNombre] = useState("");
  const [semanas, setSemanas] = useState(8);
  const [inicio, setInicio] = useState(proximoLunes());

  const crear = useMutation({
    mutationFn: () =>
      api.createBlock({
        name: nombre,
        athlete_id: athleteId,
        total_weeks: semanas,
        start_date: inicio,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bloquesAtleta", athleteId] });
      qc.invalidateQueries({ queryKey: ["misBloques"] });
      onCerrar();
    },
  });

  const esLunes = new Date(`${inicio}T00:00:00`).getDay() === 1;

  return (
    <section className="card">
      <div className="card-body stack" style={{ gap: "var(--sp-4)" }}>
        <div className="spread">
          <h2>Nuevo bloque</h2>
          <button className="btn subtle sm" onClick={onCerrar}>
            Cancelar
          </button>
        </div>

        <div className="form-grid">
          <label className="field">
            <span className="label">Nombre</span>
            <input
              className="input"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Fuerza · preparación voleibol"
              autoFocus
            />
          </label>
          <label className="field">
            <span className="label">Semanas</span>
            <input
              className="input num"
              type="number"
              min={1}
              max={52}
              value={semanas}
              onChange={(e) => setSemanas(Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span className="label">Empieza (lunes)</span>
            <input
              className="input"
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
            />
          </label>
        </div>

        {!esLunes && (
          <p className="aviso">
            <Icon name="alert" size={15} />
            Los bloques empiezan en lunes.
          </p>
        )}
        {crear.error && <ErrorBox error={crear.error} />}

        <div>
          <button
            className="btn"
            disabled={!nombre.trim() || !esLunes || crear.isPending}
            onClick={() => crear.mutate()}
          >
            {crear.isPending ? "Creando…" : "Crear bloque"}
          </button>
        </div>
      </div>
    </section>
  );
}

export function proximoLunes(): string {
  const d = new Date();
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  return d.toISOString().slice(0, 10);
}
