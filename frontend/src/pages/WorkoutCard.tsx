import { useState } from "react";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { ExerciseDefinition, SetLog, Workout } from "../lib/types";
import { Icon } from "../components/Icon";
import { StatusPill } from "../components/UI";
import { formatoCorto } from "./HomePage";

export function WorkoutCard({
  workout,
  fecha,
  diaNombre,
  editable,
}: {
  workout: Workout;
  fecha: Date;
  diaNombre: string;
  editable: boolean;
}) {
  const [anadiendo, setAnadiendo] = useState(false);

  const [ejerciciosQ, seriesQ] = useQueries({
    queries: [
      {
        queryKey: ["ejercicios", workout.id],
        queryFn: () => api.exercises(workout.id),
      },
      {
        queryKey: ["series", workout.id],
        queryFn: () => api.logs(workout.id),
      },
    ],
  });

  const ejercicios = ejerciciosQ.data ?? [];
  const series = seriesQ.data ?? [];

  return (
    <section className="card entreno">
      <div className="entreno-head">
        <div className="stack">
          <div className="row" style={{ gap: "var(--sp-3)" }}>
            <strong>{workout.name}</strong>
            <StatusPill status={workout.status} />
          </div>
          <span className="muted celda-meta">
            {diaNombre} · {formatoCorto(fecha)}
          </span>
        </div>
        {editable && (
          <button
            className="btn ghost sm"
            onClick={() => setAnadiendo((v) => !v)}
          >
            <Icon name="plus" size={15} />
            Ejercicio
          </button>
        )}
      </div>

      {anadiendo && (
        <BuscadorEjercicios
          workoutId={workout.id}
          onHecho={() => setAnadiendo(false)}
        />
      )}

      {ejercicios.length === 0 ? (
        <p className="entreno-vacio">Sin ejercicios todavía.</p>
      ) : (
        <ul className="ejercicios">
          {ejercicios.map((e) => (
            <FilaEjercicio
              key={e.id}
              definitionId={e.definition_id}
              exerciseId={e.id}
              posicion={e.position}
              workoutId={workout.id}
              series={series.filter((s) => s.exercise_id === e.id)}
              editable={editable}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function FilaEjercicio({
  definitionId,
  exerciseId,
  posicion,
  workoutId,
  series,
  editable,
}: {
  definitionId: number;
  exerciseId: number;
  posicion: number;
  workoutId: number;
  series: SetLog[];
  editable: boolean;
}) {
  const [catalogoQ] = useQueries({
    queries: [{ queryKey: ["catalogo"], queryFn: () => api.catalog() }],
  });
  const definicion = catalogoQ.data?.find(
    (d: ExerciseDefinition) => d.id === definitionId
  );

  const mejor = series.reduce<number | null>(
    (max, s) => (s.estimated_1rm && (!max || s.estimated_1rm > max) ? s.estimated_1rm : max),
    null
  );

  return (
    <li className="ejercicio">
      <div className="ejercicio-head">
        <span className="ejercicio-pos num">{posicion}</span>
        <span className="grow">
          <strong>{definicion?.name ?? `Ejercicio ${definitionId}`}</strong>
          {definicion?.muscle_group && (
            <span className="muted celda-meta"> · {definicion.muscle_group}</span>
          )}
        </span>
        {mejor && <span className="e1rm num">1RM est. {mejor} kg</span>}
      </div>

      <div className="series">
        {series.map((s) => (
          <SerieChip key={s.id} serie={s} />
        ))}
        {editable && (
          <NuevaSerie
            exerciseId={exerciseId}
            workoutId={workoutId}
            siguiente={series.length + 1}
          />
        )}
      </div>
    </li>
  );
}

function SerieChip({ serie }: { serie: SetLog }) {
  return (
    <span className="serie">
      <span className="serie-n num">{serie.set_number}</span>
      <span className="num">
        {serie.weight ?? "—"}
        {serie.weight != null && <span className="serie-u">kg</span>}
      </span>
      <span className="serie-x">×</span>
      <span className="num">{serie.reps}</span>
      {serie.rpe != null && (
        <span className="serie-rpe num">@{serie.rpe}</span>
      )}
    </span>
  );
}

/** Registra una serie con PUT: repetir la llamada no duplica nada. */
function NuevaSerie({
  exerciseId,
  workoutId,
  siguiente,
}: {
  exerciseId: number;
  workoutId: number;
  siguiente: number;
}) {
  const qc = useQueryClient();
  const [abierto, setAbierto] = useState(false);
  const [peso, setPeso] = useState("");
  const [reps, setReps] = useState("");
  const [rpe, setRpe] = useState("");

  const guardar = useMutation({
    mutationFn: () =>
      api.saveLog(exerciseId, siguiente, {
        reps: Number(reps),
        weight: peso === "" ? null : Number(peso),
        rpe: rpe === "" ? null : Number(rpe),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["series", workoutId] });
      setPeso("");
      setReps("");
      setRpe("");
      setAbierto(false);
    },
  });

  if (!abierto)
    return (
      <button className="serie-add" onClick={() => setAbierto(true)}>
        <Icon name="plus" size={13} />
        Serie
      </button>
    );

  return (
    <form
      className="serie-form"
      onSubmit={(e) => {
        e.preventDefault();
        guardar.mutate();
      }}
    >
      <input
        className="input sm num"
        placeholder="kg"
        inputMode="decimal"
        value={peso}
        onChange={(e) => setPeso(e.target.value)}
        autoFocus
      />
      <input
        className="input sm num"
        placeholder="reps"
        inputMode="numeric"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        required
      />
      <input
        className="input sm num"
        placeholder="RPE"
        inputMode="decimal"
        value={rpe}
        onChange={(e) => setRpe(e.target.value)}
      />
      <button className="btn sm" disabled={guardar.isPending}>
        <Icon name="check" size={14} />
      </button>
      <button
        type="button"
        className="btn subtle sm"
        onClick={() => setAbierto(false)}
      >
        ✕
      </button>
    </form>
  );
}

function BuscadorEjercicios({
  workoutId,
  onHecho,
}: {
  workoutId: number;
  onHecho: () => void;
}) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const [catalogoQ] = useQueries({
    queries: [{ queryKey: ["catalogo", q], queryFn: () => api.catalog(q) }],
  });

  const anadir = useMutation({
    mutationFn: (definitionId: number) =>
      api.addExercise(workoutId, definitionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ejercicios", workoutId] });
      onHecho();
    },
  });

  return (
    <div className="buscador">
      <div className="sidebar-search" style={{ margin: 0 }}>
        <Icon name="search" size={15} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar en el catálogo"
          autoFocus
        />
      </div>
      <ul className="buscador-lista">
        {(catalogoQ.data ?? []).slice(0, 8).map((d) => (
          <li key={d.id}>
            <button onClick={() => anadir.mutate(d.id)}>
              <span>{d.name}</span>
              {d.muscle_group && (
                <span className="muted celda-meta">{d.muscle_group}</span>
              )}
            </button>
          </li>
        ))}
        {(catalogoQ.data ?? []).length === 0 && (
          <li className="muted" style={{ padding: "var(--sp-3)" }}>
            Sin resultados. Los ejercicios se crean en la Biblioteca.
          </li>
        )}
      </ul>
    </div>
  );
}
