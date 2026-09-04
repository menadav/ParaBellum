import { useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { User, Weekday } from "../lib/types";
import { Icon } from "../components/Icon";
import { EmptyState, ErrorBox, Spinner, StatusPill } from "../components/UI";
import { formatoCorto } from "./HomePage";
import { WorkoutCard } from "./WorkoutCard";
import "./block.css";

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export function BlockPage() {
  const { blockId = "" } = useParams();
  const id = Number(blockId);
  const [semana, setSemana] = useState(1);
  const usuario = useOutletContext<User>();
  const qc = useQueryClient();

  const bloqueQ = useQuery({
    queryKey: ["bloque", id],
    queryFn: () => api.block(id),
  });
  const entrenosQ = useQuery({
    queryKey: ["entrenos", id, semana],
    queryFn: () => api.workouts(id, semana),
    enabled: !!bloqueQ.data,
  });

  const activar = useMutation({
    mutationFn: () => api.setBlockStatus(id, "active"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bloque", id] });
      qc.invalidateQueries({ queryKey: ["misBloques"] });
    },
  });

  if (bloqueQ.isLoading) return <Spinner label="Cargando bloque…" />;
  if (bloqueQ.error) return <ErrorBox error={bloqueQ.error} />;

  const bloque = bloqueQ.data!;
  const entrenos = entrenosQ.data ?? [];
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

        {bloque.status === "draft" && (
          <button
            className="btn"
            disabled={activar.isPending}
            onClick={() => activar.mutate()}
          >
            {activar.isPending ? "Activando…" : "Activar bloque"}
          </button>
        )}
      </div>

      {activar.error && <ErrorBox error={activar.error} />}

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
      ) : entrenos.length === 0 ? (
        <section className="card">
          <GenerarSesiones blockId={id} />
        </section>
      ) : (
        <div className="stack" style={{ gap: "var(--sp-4)" }}>
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

/** Solo aparece cuando el bloque aun no tiene sesiones. */
function GenerarSesiones({ blockId }: { blockId: number }) {
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entrenos"] }),
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
            : `Generar ${dias.length} día${dias.length === 1 ? "" : "s"} por semana`}
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
