import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { SetLog, User } from "../../lib/types";
import { EmptyState, Spinner } from "../../components/UI";

export function EstadisticasTab() {
  const atleta = useOutletContext<User>();
  const [bloqueId, setBloqueId] = useState<number | null>(null);
  const [ejercicioId, setEjercicioId] = useState<number | null>(null);

  const bloquesQ = useQuery({
    queryKey: ["bloquesAtleta", atleta.id],
    queryFn: () => api.athleteBlocks(atleta.id),
  });

  const bloques = bloquesQ.data ?? [];
  const elegido = bloqueId ?? bloques[0]?.id ?? null;

  const entrenosQ = useQuery({
    queryKey: ["entrenosBloque", elegido],
    queryFn: () => api.workouts(elegido!),
    enabled: elegido != null,
  });

  const entrenos = entrenosQ.data ?? [];

  // Un ejercicio puede repetirse cada semana: se agrupan por definicion.
  const ejerciciosQ = useQueries({
    queries: entrenos.map((w) => ({
      queryKey: ["ejercicios", w.id],
      queryFn: () => api.exercises(w.id),
    })),
  });
  const seriesQ = useQueries({
    queries: entrenos.map((w) => ({
      queryKey: ["series", w.id],
      queryFn: () => api.logs(w.id),
    })),
  });

  const porSemana = useMemo(() => {
    const ejercicios = ejerciciosQ.flatMap((q) => q.data ?? []);
    const series = seriesQ.flatMap((q) => q.data ?? []);
    const semanaDe = new Map(entrenos.map((w) => [w.id, w.week_number]));

    const definiciones = new Map<number, string>();
    const datos = new Map<number, Map<number, SetLog[]>>();

    for (const e of ejercicios) {
      definiciones.set(e.definition_id, "");
      const semana = semanaDe.get(e.workout_id);
      if (semana == null) continue;
      const suyas = series.filter((s) => s.exercise_id === e.id);
      if (suyas.length === 0) continue;
      const porDef = datos.get(e.definition_id) ?? new Map();
      porDef.set(semana, [...(porDef.get(semana) ?? []), ...suyas]);
      datos.set(e.definition_id, porDef);
    }
    return datos;
  }, [ejerciciosQ, seriesQ, entrenos]);

  const catalogoQ = useQuery({
    queryKey: ["catalogo", ""],
    queryFn: () => api.catalog(),
  });

  if (bloquesQ.isLoading) return <Spinner />;
  if (bloques.length === 0)
    return (
      <EmptyState
        icon="layers"
        title="Sin datos todavía"
        text="Las estadísticas aparecen cuando el atleta registra series."
      />
    );

  const conDatos = [...porSemana.keys()];
  const activo = ejercicioId ?? conDatos[0] ?? null;
  const nombreDe = (id: number) =>
    catalogoQ.data?.find((d) => d.id === id)?.name ?? `Ejercicio ${id}`;

  const semanas = activo != null ? porSemana.get(activo) : undefined;
  const filas = semanas
    ? [...semanas.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([semana, series]) => ({
          semana,
          series,
          e1rm: Math.max(...series.map((s) => s.estimated_1rm ?? 0)),
          tonelaje: series.reduce(
            (t, s) => t + (s.weight ?? 0) * s.reps,
            0
          ),
        }))
    : [];

  const maxE1rm = Math.max(...filas.map((f) => f.e1rm), 1);

  return (
    <div className="stack" style={{ gap: "var(--sp-4)" }}>
      <div className="stack" style={{ gap: "var(--sp-3)" }}>
        <span className="eyebrow">Bloque</span>
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          {bloques.map((b) => (
            <button
              key={b.id}
              className={`dia-btn ${b.id === elegido ? "on" : ""}`}
              onClick={() => {
                setBloqueId(b.id);
                setEjercicioId(null);
              }}
            >
              {b.name}
            </button>
          ))}
        </div>
      </div>

      {conDatos.length === 0 ? (
        <EmptyState
          icon="dumbbell"
          title="Sin series registradas en este bloque"
          text="Cuando el atleta registre sus series, aquí verás su progreso."
        />
      ) : (
        <>
          <div className="stack" style={{ gap: "var(--sp-3)" }}>
            <span className="eyebrow">Ejercicio</span>
            <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
              {conDatos.map((id) => (
                <button
                  key={id}
                  className={`dia-btn ${id === activo ? "on" : ""}`}
                  onClick={() => setEjercicioId(id)}
                >
                  {nombreDe(id)}
                </button>
              ))}
            </div>
          </div>

          <section className="card">
            <div className="card-body stack" style={{ gap: "var(--sp-5)" }}>
              <div className="spread">
                <h2>{activo != null ? nombreDe(activo) : ""}</h2>
                <span className="eyebrow">1RM estimado por semana</span>
              </div>

              <div className="grafica">
                {filas.map((f) => (
                  <div className="graf-col" key={f.semana}>
                    <span className="graf-valor num">
                      {f.e1rm ? f.e1rm.toFixed(1) : "—"}
                    </span>
                    <div
                      className="graf-barra"
                      style={{ height: `${(f.e1rm / maxE1rm) * 100}%` }}
                    />
                    <span className="graf-etiqueta">S{f.semana}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="card">
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Semana</th>
                    <th>Series</th>
                    <th>1RM est.</th>
                    <th>Tonelaje</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f) => (
                    <tr key={f.semana}>
                      <td className="num">S{f.semana}</td>
                      <td>
                        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                          {f.series.map((s) => (
                            <span className="objetivo pasado" key={s.id}>
                              <span className="num">{s.weight ?? "—"}</span>
                              <span className="serie-x">×</span>
                              <span className="num">{s.reps}</span>
                              {s.rpe != null && (
                                <span className="serie-rpe num">@{s.rpe}</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="num">
                        {f.e1rm ? f.e1rm.toFixed(1) : "—"}
                      </td>
                      <td className="num">{Math.round(f.tonelaje)} kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
