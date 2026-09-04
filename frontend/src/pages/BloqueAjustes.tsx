import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Block } from "../lib/types";
import { Confirmar } from "../components/Confirmar";
import { ErrorBox } from "../components/UI";

export function BloqueAjustes({
  bloque,
  onCerrar,
}: {
  bloque: Block;
  onCerrar: () => void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [nombre, setNombre] = useState(bloque.name);
  const [semanas, setSemanas] = useState(bloque.total_weeks);
  const [notas, setNotas] = useState(bloque.notes ?? "");
  const [borrando, setBorrando] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ["blockStats", bloque.id],
    queryFn: () => api.blockStats(bloque.id),
    enabled: borrando,
  });

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ["bloque", bloque.id] });
    qc.invalidateQueries({ queryKey: ["misBloques"] });
    qc.invalidateQueries({ queryKey: ["bloquesAtleta"] });
  };

  const guardar = useMutation({
    mutationFn: () =>
      api.updateBlock(bloque.id, {
        name: nombre.trim(),
        total_weeks: semanas,
        notes: notas.trim() || undefined,
      }),
    onSuccess: () => {
      invalidar();
      onCerrar();
    },
  });

  const borrar = useMutation({
    mutationFn: () => api.deleteBlock(bloque.id),
    onSuccess: () => {
      invalidar();
      navigate(`/atletas/${bloque.athlete_id}/programa`);
    },
  });

  const cambiado =
    nombre.trim() !== bloque.name ||
    semanas !== bloque.total_weeks ||
    notas.trim() !== (bloque.notes ?? "");

  return (
    <>
      <section className="card">
        <form
          className="card-body stack"
          style={{ gap: "var(--sp-4)" }}
          onSubmit={(e) => {
            e.preventDefault();
            if (cambiado) guardar.mutate();
          }}
        >
          <div className="spread">
            <h2>Editar bloque</h2>
            <button type="button" className="btn subtle sm" onClick={onCerrar}>
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
                required
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
          </div>

          <label className="field">
            <span className="label">Notas</span>
            <textarea
              className="input alto"
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Énfasis, objetivos, lo que quieras recordar"
            />
          </label>

          {guardar.error && <ErrorBox error={guardar.error} />}

          <div>
            <button
              className="btn"
              disabled={!cambiado || !nombre.trim() || guardar.isPending}
            >
              {guardar.isPending ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </section>

      <section className="card zona-peligro">
        <div className="card-body spread">
          <div className="stack">
            <h2>Borrar bloque</h2>
            <span className="pista">
              Se borran también sus sesiones y todo lo que el atleta haya
              registrado. No se puede deshacer.
            </span>
          </div>
          <button className="btn peligro" onClick={() => setBorrando(true)}>
            Borrar
          </button>
        </div>
      </section>

      {borrando && (
        <Confirmar
          titulo={`¿Borrar «${bloque.name}»?`}
          escribir={bloque.name}
          textoBoton="Borrar el bloque"
          cargando={borrar.isPending}
          error={borrar.error}
          onCancelar={() => setBorrando(false)}
          onConfirmar={() => borrar.mutate()}
          descripcion={
            <>
              Esto no se puede deshacer. Se perderá:
              <ul>
                <li>
                  <b>{stats?.workouts ?? "…"}</b> sesiones
                </li>
                <li>
                  <b>{stats?.exercises ?? "…"}</b> ejercicios programados
                </li>
                <li>
                  <b>{stats?.logs ?? "…"}</b> series registradas por el atleta
                </li>
              </ul>
            </>
          }
        />
      )}
    </>
  );
}
