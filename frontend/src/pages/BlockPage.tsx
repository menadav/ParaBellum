import { useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Block, User, Weekday } from "../lib/types";
import { Icon } from "../components/Icon";
import { EmptyState, ErrorBox, Spinner, StatusPill } from "../components/UI";
import { formatoCorto } from "./HomePage";
import { WorkoutCard } from "./WorkoutCard";
import { BloqueAjustes } from "./BloqueAjustes";
import "./block.css";

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export function BlockPage() {
  const { blockId = "" } = useParams();
  const id = Number(blockId);
  const [semana, setSemana] = useState(1);
  const usuario = useOutletContext<User>();
  const esCoach = usuario.role === "coach";
  const [ajustes, setAjustes] = useState(false);
  const qc = useQueryClient();

  const bloqueQ = useQuery({
    queryKey: ["bloque", id],
    queryFn: () => api.block(id),
  });
  // Todas las sesiones del bloque de una vez: hacen falta las de la
  // semana que se ve Y saber si el bloque esta vacio del todo.
  const entrenosQ = useQuery({
    queryKey: ["entrenos", id],
    queryFn: () => api.workouts(id),
    enabled: !!bloqueQ.data,
  });

  const cambiarEstado = useMutation({
    mutationFn: (estado: Block["status"]) => api.setBlockStatus(id, estado),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bloque", id] });
      qc.invalidateQueries({ queryKey: ["misBloques"] });
      qc.invalidateQueries({ queryKey: ["bloquesAtleta"] });
    },
  });

  if (bloqueQ.isLoading) return <Spinner label="Cargando bloque…" />;
  if (bloqueQ.error) return <ErrorBox error={bloqueQ.error} />;

  const bloque = bloqueQ.data!;
  const todos = entrenosQ.data ?? [];
  const entrenos = todos.filter((w) => w.week_number === semana);
  const bloqueVacio = todos.length === 0;
  const inicio = new Date(bloque.start_date);

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-title">
          <div className="row" style={{ gap: "var(--sp-3)" }}>
            <h1>{bloque.name}</h1>
            <StatusPill status={bloque.status} />
          </div>
          <p>
            {bloque.total_weeks} semanas ·{" "}
            {formatoCorto(inicio)} – {formatoCorto(new Date(bloque.end_date))}
          </p>
        </div>

        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          <BotonExportar blockId={id} />
          {esCoach && (
            <>
            <button
              className="btn ghost"
              onClick={() => setAjustes((v) => !v)}
            >
              Editar
            </button>
            {bloque.status !== "active" && (
              <button
                className="btn"
                disabled={cambiarEstado.isPending}
                onClick={() => cambiarEstado.mutate("active")}
              >
                Activar bloque
              </button>
            )}
            {bloque.status === "active" && (
              <>
                <button
                  className="btn ghost"
                  disabled={cambiarEstado.isPending}
                  onClick={() => cambiarEstado.mutate("draft")}
                  title="Vuelve a borrador: el atleta deja de verlo"
                >
                  Desactivar
                </button>
                <button
                  className="btn ghost"
                  disabled={cambiarEstado.isPending}
                  onClick={() => cambiarEstado.mutate("completed")}
                >
                  Dar por terminado
                </button>
              </>
            )}
            </>
          )}
        </div>
      </div>

      {cambiarEstado.error && <ErrorBox error={cambiarEstado.error} />}

      {ajustes && (
        <BloqueAjustes bloque={bloque} onCerrar={() => setAjustes(false)} />
      )}

      <nav className="semanas" aria-label="Semanas del bloque">
        {Array.from({ length: bloque.total_weeks }, (_, i) => i + 1).map(
          (n) => (
            <button
              key={n}
              className={`semana ${n === semana ? "activa" : ""}`}
              onClick={() => setSemana(n)}
            >
              {n}
            </button>
          )
        )}
        {esCoach && bloque.status !== "completed" && (
          <SemanasDelBloque
            bloque={bloque}
            onQuitada={() =>
              setSemana((s) => Math.min(s, bloque.total_weeks - 1) || 1)
            }
          />
        )}
      </nav>

      {entrenos.length > 0 && (
        <div className="leyenda">
          <span>
            <i className="hecha" />
            Hecha por el atleta
          </span>
          <span>
            <i className="pendiente" />
            Pendiente, la dejó planificada el coach
          </span>
        </div>
      )}

      {entrenosQ.isLoading ? (
        <Spinner />
      ) : bloqueVacio ? (
        <section className="card">
          <GenerarSesiones blockId={id} totalSemanas={bloque.total_weeks} />
        </section>
      ) : (
        <div className="stack" style={{ gap: "var(--sp-4)" }}>
          {esCoach && bloque.status !== "completed" && (
            <AnadirDia
              blockId={id}
              semana={semana}
              ocupados={entrenos.map((w) => w.day_of_week)}
            />
          )}
          {entrenos.length === 0 && (
            <p className="semana-vacia">
              La semana {semana} no tiene sesiones. Añádelas con el botón
              de arriba.
            </p>
          )}
          {entrenos.map((w) => (
            <WorkoutCard
              key={w.id}
              workout={w}
              bloque={bloque}
              fecha={fechaDe(inicio, semana, w.day_of_week)}
              diaNombre={DIAS[w.day_of_week]}
              editable={bloque.status !== "completed"}
              usuario={usuario}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GenerarSesiones({
  blockId,
  totalSemanas,
}: {
  blockId: number;
  totalSemanas: number;
}) {
  const qc = useQueryClient();
  const [dias, setDias] = useState<Weekday[]>([0, 2, 4]);

  const generar = useMutation({
    mutationFn: () =>
      api.generateWorkouts(blockId, {
        days: [...dias].sort((a, b) => a - b),
        names: [...dias]
          .sort((a, b) => a - b)
          .map((_, i) => `Día ${i + 1}`),
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["entrenos", blockId] }),
  });

  const alternar = (d: Weekday) =>
    setDias((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );

  return (
    <div className="card-body stack" style={{ gap: "var(--sp-4)" }}>
      <EmptyState
        icon="calendar"
        title="Este bloque todavía no tiene sesiones"
        text="Elige los días de entreno y se generarán todas las semanas de golpe."
      />

      <div className="dias-picker">
        {DIAS.map((d, i) => (
          <button
            key={d}
            className={`dia-btn ${dias.includes(i as Weekday) ? "on" : ""}`}
            onClick={() => alternar(i as Weekday)}
          >
            {d.slice(0, 3)}
          </button>
        ))}
      </div>

      {generar.error && <ErrorBox error={generar.error} />}

      <div className="row" style={{ justifyContent: "center" }}>
        <button
          className="btn"
          disabled={dias.length === 0 || generar.isPending}
          onClick={() => generar.mutate()}
        >
          <Icon name="plus" size={16} />
          {generar.isPending
            ? "Generando…"
            : `Generar ${dias.length} × ${totalSemanas} = ${
                dias.length * totalSemanas
              } sesiones`}
        </button>
      </div>
    </div>
  );
}

function fechaDe(inicio: Date, semana: number, dia: number): Date {
  const d = new Date(inicio);
  d.setDate(inicio.getDate() + (semana - 1) * 7 + dia);
  return d;
}

function AnadirDia({
  blockId,
  semana,
  ocupados,
}: {
  blockId: number;
  semana: number;
  ocupados: Weekday[];
}) {
  const qc = useQueryClient();
  const [abierto, setAbierto] = useState(false);
  const [dia, setDia] = useState<Weekday | null>(null);
  const [nombre, setNombre] = useState("");

  const anadir = useMutation({
    mutationFn: () =>
      api.addWorkout(blockId, {
        name: nombre.trim() || `Día ${ocupados.length + 1}`,
        week_number: semana,
        day_of_week: dia!,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entrenos", blockId] });
      setAbierto(false);
      setDia(null);
      setNombre("");
    },
  });

  const libres = ([0, 1, 2, 3, 4, 5, 6] as Weekday[]).filter(
    (d) => !ocupados.includes(d)
  );

  if (libres.length === 0) return null;

  if (!abierto)
    return (
      <button
        className="btn ghost"
        style={{ alignSelf: "flex-start" }}
        onClick={() => setAbierto(true)}
      >
        <Icon name="plus" size={16} />
        Añadir día a la semana {semana}
      </button>
    );

  return (
    <section className="card">
      <form
        className="card-body stack"
        style={{ gap: "var(--sp-4)" }}
        onSubmit={(e) => {
          e.preventDefault();
          if (dia != null) anadir.mutate();
        }}
      >
        <div className="spread">
          <h2>Nuevo día · semana {semana}</h2>
          <button
            type="button"
            className="btn subtle sm"
            onClick={() => setAbierto(false)}
          >
            Cancelar
          </button>
        </div>

        <div className="dias-picker" style={{ justifyContent: "flex-start" }}>
          {libres.map((d) => (
            <button
              key={d}
              type="button"
              className={`dia-btn ${dia === d ? "on" : ""}`}
              onClick={() => setDia(d)}
            >
              {DIAS[d].slice(0, 3)}
            </button>
          ))}
        </div>

        <label className="field" style={{ maxWidth: 320 }}>
          <span className="label">Nombre de la sesión</span>
          <input
            className="input"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Día 4 · Full body"
          />
        </label>

        {anadir.error && <ErrorBox error={anadir.error} />}

        <div>
          <button className="btn" disabled={dia == null || anadir.isPending}>
            {anadir.isPending ? "Añadiendo…" : "Añadir día"}
          </button>
        </div>
      </form>
    </section>
  );
}


function SemanasDelBloque({
  bloque,
  onQuitada,
}: {
  bloque: Block;
  onQuitada: () => void;
}) {
  const qc = useQueryClient();

  const cambiar = useMutation({
    mutationFn: (total: number) =>
      api.updateBlock(bloque.id, { total_weeks: total }),
    onSuccess: (_d, total) => {
      qc.invalidateQueries({ queryKey: ["bloque", bloque.id] });
      qc.invalidateQueries({ queryKey: ["misBloques"] });
      qc.invalidateQueries({ queryKey: ["bloquesAtleta"] });
      if (total < bloque.total_weeks) onQuitada();
    },
  });

  return (
    <span className="semanas-control">
      <button
        className="semana ajuste"
        onClick={() => cambiar.mutate(bloque.total_weeks - 1)}
        disabled={bloque.total_weeks <= 1 || cambiar.isPending}
        title="Quitar la última semana"
        aria-label="Quitar la última semana"
      >
        −
      </button>
      <button
        className="semana ajuste"
        onClick={() => cambiar.mutate(bloque.total_weeks + 1)}
        disabled={bloque.total_weeks >= 52 || cambiar.isPending}
        title="Añadir una semana"
        aria-label="Añadir una semana"
      >
        +
      </button>
      {cambiar.isError && (
        <span className="semanas-error">
          {(cambiar.error as Error).message}
        </span>
      )}
    </span>
  );
}


function BotonExportar({ blockId }: { blockId: number }) {
  const descarga = useMutation({ mutationFn: () => api.exportBlock(blockId) });

  return (
    <>
      <button
        className="btn ghost"
        disabled={descarga.isPending}
        onClick={() => descarga.mutate()}
        title="Descarga todas las series de este bloque en Excel"
      >
        <Icon name="download" size={15} />
        {descarga.isPending ? "Preparando…" : "Excel"}
      </button>
      {descarga.error && <ErrorBox error={descarga.error} />}
    </>
  );
}
