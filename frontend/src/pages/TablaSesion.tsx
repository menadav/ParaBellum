import { Fragment } from "react";
import { useQueries } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Block, SetLog, Workout } from "../lib/types";
import { Spinner } from "../components/UI";
import "./tabla.css";

// Como en la hoja del Excel: la columna E1RM solo va en la serie 1.
const COLUMNAS_SERIE = ["Peso", "Reps", "RPE"];

export function TablaSesion({
  workout,
  bloque,
  fecha,
  diaNombre,
}: {
  workout: Workout;
  bloque: Block;
  fecha: Date;
  diaNombre: string;
}) {
  const [ejerciciosQ, seriesQ, catalogoQ] = useQueries({
    queries: [
      {
        queryKey: ["ejercicios", workout.id],
        queryFn: () => api.exercises(workout.id),
      },
      { queryKey: ["series", workout.id], queryFn: () => api.logs(workout.id) },
      { queryKey: ["catalogo", ""], queryFn: () => api.catalog() },
    ],
  });

  if (ejerciciosQ.isLoading || seriesQ.isLoading) return <Spinner />;

  const ejercicios = ejerciciosQ.data ?? [];
  const series = seriesQ.data ?? [];
  const nombres = new Map(
    (catalogoQ.data ?? []).map((d) => [d.id, d])
  );

  const porEjercicio = new Map<number, SetLog[]>();
  for (const serie of series) {
    const lista = porEjercicio.get(serie.exercise_id) ?? [];
    lista.push(serie);
    porEjercicio.set(serie.exercise_id, lista);
  }
  for (const lista of porEjercicio.values())
    lista.sort((a, b) => a.set_number - b.set_number);

  const maxSeries = Math.max(
    1,
    ...ejercicios.map((e) => porEjercicio.get(e.id)?.length ?? 0)
  );
  const seriesVisibles = Array.from({ length: maxSeries }, (_, i) => i + 1);

  const tonelaje = series.reduce(
    (suma, s) => suma + (s.weight ?? 0) * s.reps,
    0
  );

  return (
    <section className="tabla-sesion">
      <header className="tabla-head">
        <div>
          <strong>{workout.name}</strong>
          <span className="muted">
            {" "}
            · {diaNombre} {fecha.toLocaleDateString("es-ES")}
          </span>
        </div>
        <span className="muted">
          {ejercicios.length} ejercicios · {series.length} series ·{" "}
          {Math.round(tonelaje).toLocaleString("es-ES")} kg
        </span>
      </header>

      <div className="tabla-scroll">
        <table className="tabla-excel">
          <thead>
            <tr className="fila-grupos">
              <th colSpan={4} className="grupo-prescrito">
                Prescrito por el entrenador
              </th>
              {seriesVisibles.map((n) => (
                <th
                  key={n}
                  colSpan={COLUMNAS_SERIE.length + (n === 1 ? 1 : 0)}
                  className="grupo-serie"
                >
                  Serie {n}
                </th>
              ))}
            </tr>
            <tr>
              <th className="col-num">#</th>
              <th className="col-ejercicio">Ejercicio</th>
              <th className="col-protocolo">Protocolo y notas</th>
              <th className="col-video">Vídeo</th>
              {seriesVisibles.map((n) => (
                <Fragment key={n}>
                  {COLUMNAS_SERIE.map((c) => (
                    <th key={c} className="col-dato">
                      {c}
                    </th>
                  ))}
                  {n === 1 && <th className="col-dato col-e1rm">E1RM</th>}
                </Fragment>
              ))}
            </tr>
          </thead>

          <tbody>
            {ejercicios.map((ejercicio, i) => {
              const definicion = nombres.get(ejercicio.definition_id);
              const suyas = porEjercicio.get(ejercicio.id) ?? [];
              const mejor = suyas.reduce<number | null>(
                (top, s) =>
                  s.estimated_1rm !== null &&
                  (top === null || s.estimated_1rm > top)
                    ? s.estimated_1rm
                    : top,
                null
              );

              return (
                <tr key={ejercicio.id}>
                  <td className="col-num muted">{i + 1}</td>
                  <td className="col-ejercicio">
                    <strong>{definicion?.name ?? "—"}</strong>
                    {definicion?.muscle_group && (
                      <span className="grupo">{definicion.muscle_group}</span>
                    )}
                  </td>
                  <td className="col-protocolo muted">
                    {ejercicio.notes ?? ""}
                  </td>
                  <td className="col-video">
                    {suyas.some((s) => s.video_required) ? "☑" : "☐"}
                  </td>

                  {seriesVisibles.map((n) => {
                    const serie = suyas.find((s) => s.set_number === n);
                    // La escribio el coach: esta planificada, no hecha.
                    const pendiente = serie?.logged_by === bloque.coach_id;
                    const clase = `col-dato ${pendiente ? "pendiente" : ""}`;
                    return (
                      <Fragment key={n}>
                        <td className={clase}>{serie?.weight ?? ""}</td>
                        <td className={clase}>{serie?.reps ?? ""}</td>
                        <td className={clase}>{serie?.rpe ?? ""}</td>
                        {n === 1 && (
                          <td className="col-dato col-e1rm">{mejor ?? ""}</td>
                        )}
                      </Fragment>
                    );
                  })}
                </tr>
              );
            })}

            {ejercicios.length === 0 && (
              <tr>
                <td colSpan={4 + maxSeries * 3 + 1} className="muted vacia">
                  Esta sesión no tiene ejercicios.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
