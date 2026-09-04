import { Link, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { Block, User } from "../../lib/types";
import { Icon } from "../../components/Icon";
import { CardHead, EmptyState, Spinner } from "../../components/UI";
import { formatoCorto } from "../HomePage";

export function ResumenTab() {
  const atleta = useOutletContext<User>();

  const bloquesQ = useQuery({
    queryKey: ["bloquesAtleta", atleta.id],
    queryFn: () => api.athleteBlocks(atleta.id),
  });
  const fichaQ = useQuery({
    queryKey: ["ficha", atleta.id],
    queryFn: () => api.athleteProfile(atleta.id),
  });

  if (bloquesQ.isLoading) return <Spinner />;

  const bloques = bloquesQ.data ?? [];
  const activo = bloques.find((b) => b.status === "active");
  const ficha = fichaQ.data;

  return (
    <div className="grid-2">
      <section className="card">
        <CardHead icon="layers" title="Bloque en curso" />
        <div className="card-body">
          {activo ? (
            <BloqueEnCurso bloque={activo} />
          ) : (
            <EmptyState
              icon="layers"
              title="Sin bloque activo"
              text="Créale uno desde la pestaña Programa."
            />
          )}
        </div>
      </section>

      <section className="card">
        <CardHead icon="dumbbell" title="Marcas de referencia" />
        <div className="card-body">
          {ficha?.total ? (
            <div className="marcas">
              <Marca etiqueta="Sentadilla" valor={ficha.best_squat} />
              <Marca etiqueta="Press banca" valor={ficha.best_bench} />
              <Marca etiqueta="Peso muerto" valor={ficha.best_deadlift} />
              <Marca etiqueta="Total" valor={ficha.total} destacada />
            </div>
          ) : (
            <EmptyState
              icon="dumbbell"
              title="Sin marcas"
              text="Rellena SQ, BP y DL en la pestaña Ficha."
            />
          )}
        </div>
      </section>

      <section className="card" style={{ gridColumn: "1 / -1" }}>
        <CardHead
          icon="calendar"
          title="Historial de bloques"
          aside={`${bloques.length}`}
        />
        <div className="card-body">
          {bloques.length === 0 ? (
            <EmptyState icon="calendar" title="Todavía no ha entrenado" />
          ) : (
            <ul className="lista-simple">
              {bloques.slice(0, 6).map((b) => (
                <li key={b.id}>
                  <Link to={`/bloques/${b.id}`} className="spread">
                    <span>{b.name}</span>
                    <span className="muted row" style={{ gap: 8 }}>
                      {formatoCorto(new Date(b.start_date))} –{" "}
                      {formatoCorto(new Date(b.end_date))}
                      <Icon name="chevronRight" size={15} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function BloqueEnCurso({ bloque }: { bloque: Block }) {
  const inicio = new Date(bloque.start_date);
  const hoy = new Date();
  const dias = Math.floor(
    (hoy.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)
  );
  const semana = Math.min(
    Math.max(Math.floor(dias / 7) + 1, 1),
    bloque.total_weeks
  );

  return (
    <Link to={`/bloques/${bloque.id}`} className="stack" style={{ gap: 12 }}>
      <div className="spread">
        <strong>{bloque.name}</strong>
        <Icon name="chevronRight" size={16} />
      </div>
      <span className="muted celda-meta">
        Semana {semana} de {bloque.total_weeks} · hasta el{" "}
        {formatoCorto(new Date(bloque.end_date))}
      </span>
      <div className="progreso">
        {Array.from({ length: bloque.total_weeks }, (_, i) => (
          <span key={i} className={i < semana ? "hecha" : ""} />
        ))}
      </div>
    </Link>
  );
}

function Marca({
  etiqueta,
  valor,
  destacada,
}: {
  etiqueta: string;
  valor: number | null;
  destacada?: boolean;
}) {
  return (
    <div className={`marca ${destacada ? "destacada" : ""}`}>
      <span className="marca-valor num">{valor ?? "—"}</span>
      <span className="marca-etiqueta">{etiqueta}</span>
    </div>
  );
}
