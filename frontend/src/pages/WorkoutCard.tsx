import { useState } from "react";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type {
  Block,
  ExerciseDefinition,
  SetLog,
  User,
  Workout,
} from "../lib/types";
import { Icon } from "../components/Icon";
import { StatusPill } from "../components/UI";
import { formatoCorto } from "./HomePage";

export function WorkoutCard({
  workout,
  bloque,
  fecha,
  diaNombre,
  editable,
  usuario,
}: {
  workout: Workout;
  bloque: Block;
  fecha: Date;
  diaNombre: string;
  editable: boolean;
  usuario: User;
}) {
  const [anadiendo, setAnadiendo] = useState(false);
  const esCoach = usuario.role === "coach";

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

  const ejercicios = ejerciciosQ.data ?? [];
  const series = seriesQ.data ?? [];
  const catalogo = catalogoQ.data ?? [];

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
        {editable && esCoach && (
          <div className="row" style={{ gap: 4 }}>
            <button
              className="btn ghost sm"
              onClick={() => setAnadiendo((v) => !v)}
            >
              <Icon name="plus" size={15} />
              Ejercicio
            </button>
            <BorrarSesion workoutId={workout.id} blockId={workout.block_id} />
          </div>
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
              exerciseId={e.id}
              posicion={e.position}
              workoutId={workout.id}
              definicion={catalogo.find(
                (d: ExerciseDefinition) => d.id === e.definition_id
              )}
              series={series.filter((s) => s.exercise_id === e.id)}
              athleteId={bloque.athlete_id}
              editable={editable}
              esCoach={esCoach}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function FilaEjercicio({
  exerciseId,
  posicion,
  workoutId,
  definicion,
  series,
  athleteId,
  editable,
  esCoach,
}: {
  exerciseId: number;
  posicion: number;
  workoutId: number;
  definicion?: ExerciseDefinition;
  series: SetLog[];
  athleteId: string;
  editable: boolean;
  esCoach: boolean;
}) {
  const mejor = series.reduce<number | null>(
    (max, s) =>
      s.estimated_1rm && (!max || s.estimated_1rm > max)
        ? s.estimated_1rm
        : max,
    null
  );

  return (
    <li className="ejercicio">
      <div className="ejercicio-head">
        <span className="ejercicio-pos num">{posicion}</span>
        <span className="grow">
          <strong>{definicion?.name ?? `Ejercicio ${exerciseId}`}</strong>
          {definicion?.muscle_group && (
            <span className="muted celda-meta">
              {" "}
              · {definicion.muscle_group}
            </span>
          )}
        </span>
        {mejor && <span className="e1rm num">1RM est. {mejor} kg</span>}
        {editable && esCoach && (
          <QuitarEjercicio exerciseId={exerciseId} workoutId={workoutId} />
        )}
      </div>

      <div className="ejercicio-cuerpo">
        <UltimaVez exerciseId={exerciseId} />

        <div className="series">
          {series.map((s) => (
            <SerieChip
              key={s.id}
              serie={s}
              exerciseId={exerciseId}
              workoutId={workoutId}
              hecha={s.logged_by === athleteId}
              puedeTocar={editable}
              esCoach={esCoach}
            />
          ))}
          {editable && (
            <NuevaSerie
              exerciseId={exerciseId}
              workoutId={workoutId}
              siguiente={siguienteNumero(series)}
              ultima={series.at(-1)}
            />
          )}
        </div>
      </div>
    </li>
  );
}

/** El primer hueco libre: si borras la 2, la siguiente vuelve a ser la 2. */
function siguienteNumero(series: SetLog[]): number {
  const usados = new Set(series.map((s) => s.set_number));
  let n = 1;
  while (usados.has(n)) n++;
  return n;
}

/** La ultima serie que hizo de este ejercicio, como referencia. */
function UltimaVez({ exerciseId }: { exerciseId: number }) {
  const [q] = useQueries({
    queries: [
      {
        queryKey: ["historial", exerciseId],
        queryFn: () => api.exerciseHistory(exerciseId),
        staleTime: 5 * 60_000,
      },
    ],
  });

  // history() viene ordenado por fecha descendente: la primera es la
  // ultima que hizo.
  const ultima = q.data?.[0];
  if (!ultima) return null;

  return (
    <div className="ultima-vez">
      <span className="ultima-tag">Última vez</span>
      <span className="objetivo pasado">
        <span className="num">{ultima.weight ?? "—"}</span>
        {ultima.weight != null && <span className="objetivo-u">kg</span>}
        <span className="serie-x">×</span>
        <span className="num">{ultima.reps}</span>
        {ultima.rpe != null && (
          <span className="serie-rpe num">@{ultima.rpe}</span>
        )}
      </span>
      {ultima.completed_at && (
        <span className="muted celda-meta">
          {formatoCorto(new Date(ultima.completed_at))}
        </span>
      )}
    </div>
  );
}

/** Una serie registrada. Se edita pulsandola y se borra con la papelera. */
function SerieChip({
  serie,
  exerciseId,
  workoutId,
  hecha,
  puedeTocar,
  esCoach,
}: {
  serie: SetLog;
  exerciseId: number;
  workoutId: number;
  hecha: boolean;
  puedeTocar: boolean;
  esCoach: boolean;
}) {
  const qc = useQueryClient();
  const [editando, setEditando] = useState(false);

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ["series", workoutId] });
    qc.invalidateQueries({ queryKey: ["historial", exerciseId] });
  };

  const borrar = useMutation({
    mutationFn: () => api.deleteLog(exerciseId, serie.set_number),
    onSuccess: invalidar,
  });

  const grabar = useMutation({
    mutationFn: () =>
      api.setVideoRequired(
        exerciseId,
        serie.set_number,
        !serie.video_required
      ),
    onSuccess: invalidar,
  });

  if (editando)
    return (
      <FormularioSerie
        exerciseId={exerciseId}
        desde={serie.set_number}
        inicial={serie}
        onHecho={() => setEditando(false)}
        onGuardado={invalidar}
      />
    );

  return (
    <span
      className={`serie ${hecha ? "hecha" : "pendiente"} ${
        serie.video_required ? "grabar" : ""
      } ${borrar.isPending ? "borrando" : ""}`}
      title={
        serie.video_required
          ? "El coach pide que grabes esta serie"
          : hecha
            ? undefined
            : "Pendiente: lo dejo planificado el coach"
      }
    >
      <button
        type="button"
        className="serie-valores"
        onClick={() => puedeTocar && setEditando(true)}
        disabled={!puedeTocar}
        title={puedeTocar ? "Editar esta serie" : undefined}
      >
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
        {serie.video_required && (
          <span className="serie-video" aria-label="Grabar esta serie">
            <IconVideo />
          </span>
        )}
      </button>
      {puedeTocar && esCoach && (
        <button
          className={`serie-marcar ${serie.video_required ? "on" : ""}`}
          onClick={() => grabar.mutate()}
          disabled={grabar.isPending}
          title={
            serie.video_required
              ? "Quitar el aviso de grabar"
              : "Pedir al atleta que grabe esta serie"
          }
          aria-label="Pedir vídeo de esta serie"
        >
          <IconVideo />
        </button>
      )}
      {puedeTocar && (
        <button
          className="serie-borrar"
          onClick={() => borrar.mutate()}
          disabled={borrar.isPending}
          title={`Borrar la serie ${serie.set_number}`}
          aria-label={`Borrar la serie ${serie.set_number}`}
        >
          <Icon name="trash" size={12} />
        </button>
      )}
    </span>
  );
}

/**
 * Formulario de serie. Al crear lleva contador para meter varias
 * iguales de golpe; al editar una que ya existe, no.
 */
function FormularioSerie({
  exerciseId,
  desde,
  inicial,
  onHecho,
  onGuardado,
  conContador,
}: {
  exerciseId: number;
  desde: number;
  inicial?: { weight: number | null; reps: number; rpe: number | null };
  onHecho: () => void;
  onGuardado: () => void;
  conContador?: boolean;
}) {
  const [peso, setPeso] = useState(
    inicial?.weight != null ? String(inicial.weight) : ""
  );
  const [reps, setReps] = useState(inicial ? String(inicial.reps) : "");
  const [rpe, setRpe] = useState(
    inicial?.rpe != null ? String(inicial.rpe) : ""
  );
  const [cantidad, setCantidad] = useState("1");

  const guardar = useMutation({
    mutationFn: async () => {
      const n = conContador
        ? Math.max(1, Math.min(20, Number(cantidad) || 1))
        : 1;
      const cuerpo = {
        reps: Number(reps),
        weight: peso === "" ? null : Number(peso),
        rpe: rpe === "" ? null : Number(rpe),
      };
      // Una a una y en orden: cada PUT lleva su propio numero de serie.
      for (let i = 0; i < n; i++) {
        await api.saveLog(exerciseId, desde + i, cuerpo);
      }
    },
    onSuccess: () => {
      onGuardado();
      onHecho();
    },
  });

  return (
    <form
      className="serie-form"
      onSubmit={(e) => {
        e.preventDefault();
        guardar.mutate();
      }}
    >
      {conContador ? (
        <label className="campo-mini">
          <input
            className="input sm num contador"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            inputMode="numeric"
            title="Cuántas series iguales"
            aria-label="Cuántas series iguales"
          />
          <span>×</span>
        </label>
      ) : (
        <span className="serie-n num">{desde}</span>
      )}
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
      <button type="button" className="btn subtle sm" onClick={onHecho}>
        ✕
      </button>
      {guardar.isError && (
        <span className="serie-error">
          {(guardar.error as Error).message}
        </span>
      )}
    </form>
  );
}

/** Serie nueva, precargada con la anterior y con contador de repetidas. */
function NuevaSerie({
  exerciseId,
  workoutId,
  siguiente,
  ultima,
}: {
  exerciseId: number;
  workoutId: number;
  siguiente: number;
  ultima?: SetLog;
}) {
  const qc = useQueryClient();
  const [abierto, setAbierto] = useState(false);

  if (!abierto)
    return (
      <button className="serie-add" onClick={() => setAbierto(true)}>
        <Icon name="plus" size={13} />
        Serie
      </button>
    );

  return (
    <FormularioSerie
      exerciseId={exerciseId}
      desde={siguiente}
      inicial={ultima}
      conContador
      onHecho={() => setAbierto(false)}
      onGuardado={() => {
        qc.invalidateQueries({ queryKey: ["series", workoutId] });
        qc.invalidateQueries({ queryKey: ["historial", exerciseId] });
      }}
    />
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


function IconVideo() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m23 7-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  );
}

/** Quita un ejercicio del entreno, con confirmacion en dos pasos. */
function QuitarEjercicio({
  exerciseId,
  workoutId,
}: {
  exerciseId: number;
  workoutId: number;
}) {
  const qc = useQueryClient();
  const [confirmando, setConfirmando] = useState(false);

  const quitar = useMutation({
    mutationFn: () => api.removeExercise(exerciseId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ejercicios", workoutId] });
      qc.invalidateQueries({ queryKey: ["series", workoutId] });
    },
  });

  if (!confirmando)
    return (
      <button
        className="btn subtle sm"
        onClick={() => setConfirmando(true)}
        title="Quitar del entreno"
        aria-label="Quitar ejercicio del entreno"
      >
        <Icon name="trash" size={14} />
      </button>
    );

  return (
    <span className="row" style={{ gap: 4 }}>
      <button
        className="btn sm"
        onClick={() => quitar.mutate()}
        disabled={quitar.isPending}
      >
        {quitar.isPending ? "…" : "Quitar"}
      </button>
      <button
        className="btn subtle sm"
        onClick={() => setConfirmando(false)}
      >
        No
      </button>
    </span>
  );
}

/** Borra la sesion entera. El cascade se lleva ejercicios y series. */
function BorrarSesion({
  workoutId,
  blockId,
}: {
  workoutId: number;
  blockId: number;
}) {
  const qc = useQueryClient();
  const [confirmando, setConfirmando] = useState(false);

  const borrar = useMutation({
    mutationFn: () => api.deleteWorkout(workoutId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["entrenos", blockId] }),
  });

  if (!confirmando)
    return (
      <button
        className="btn subtle sm"
        onClick={() => setConfirmando(true)}
        title="Borrar esta sesión"
        aria-label="Borrar esta sesión"
      >
        <Icon name="trash" size={15} />
      </button>
    );

  return (
    <span className="row" style={{ gap: 4 }}>
      <span className="muted celda-meta">¿Borrar el día?</span>
      <button
        className="btn sm"
        onClick={() => borrar.mutate()}
        disabled={borrar.isPending}
      >
        {borrar.isPending ? "…" : "Sí"}
      </button>
      <button className="btn subtle sm" onClick={() => setConfirmando(false)}>
        No
      </button>
    </span>
  );
}
