import { Link, useOutletContext } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Block, User } from "../lib/types";
import { Icon } from "../components/Icon";
import { CardHead, EmptyState, Meter, Ring, Spinner } from "../components/UI";

export function HomePage() {
  const usuario = useOutletContext<User>();
  const esCoach = usuario.role === "coach";

  const [atletasQ, bloquesQ] = useQueries({
    queries: [
      { queryKey: ["atletas"], queryFn: api.athletes, enabled: esCoach },
      { queryKey: ["misBloques"], queryFn: api.myBlocks },
    ],
  });

  if (atletasQ.isLoading || bloquesQ.isLoading)
    return <Spinner label="Cargando…" />;

  const atletas = atletasQ.data ?? [];
  const bloques = bloquesQ.data ?? [];
  const pendientes = atletas.filter((a) => a.status === "pending").length;
  const conBloqueActivo = new Set(
    bloques.filter((b) => b.status === "active").map((b) => b.athlete_id)
  );
  const sinBloque = atletas.filter((a) => !conBloqueActivo.has(a.id));

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-title">
          <h1>Hola, {usuario.name.split(" ")[0]}</h1>
          <p>
            {esCoach
              ? `${atletas.length} atleta${atletas.length === 1 ? "" : "s"} a tu cargo`
              : "Tu entrenamiento de un vistazo"}
          </p>
        </div>
      </div>

      {esCoach ? (
        <>
          <div className="grid-2">
            <section className="card">
              <CardHead icon="circleCheck" title="Atletas pendientes" />
              <div className="card-body row" style={{ gap: "var(--sp-5)" }}>
                <Ring
                  value={pendientes}
                  total={Math.max(atletas.length, 1)}
                  caption="pendientes"
                />
                <p className="muted">
                  de {atletas.length} atleta{atletas.length === 1 ? "" : "s"}
                </p>
              </div>
            </section>

            <section className="card">
              <CardHead icon="layers" title="Trabajo por hacer" />
              <div
                className="card-body stack"
                style={{ gap: "var(--sp-5)" }}
              >
                <Meter
                  label="Atletas sin bloque activo"
                  value={sinBloque.length}
                  max={Math.max(atletas.length, 1)}
                />
                <Meter
                  label="Bloques en borrador"
                  value={bloques.filter((b) => b.status === "draft").length}
                  max={Math.max(bloques.length, 1)}
                />
              </div>
            </section>
          </div>

          <div className="grid-2">
            <BloquesQueTerminan bloques={bloques} />

            <section className="card">
              <CardHead icon="userPlus" title="Atletas" />
              <div className="card-body">
                {atletas.length === 0 ? (
                  <EmptyState
                    icon="userPlus"
                    title="Todavía no tienes atletas"
                    text="Los atletas se dan de alta desde Supabase mientras no exista la pantalla de invitaciones."
                  />
                ) : (
                  <ul className="lista-simple">
                    {atletas.map((a) => (
                      <li key={a.id}>
                        <Link to={`/atletas/${a.id}`} className="spread">
                          <span>{a.name}</span>
                          <span className="muted row" style={{ gap: 6 }}>
                            {conBloqueActivo.has(a.id)
                              ? "Bloque activo"
                              : "Sin bloque"}
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
        </>
      ) : (
        <VistaAtleta bloques={bloques} />
      )}
    </div>
  );
}

function BloquesQueTerminan({ bloques }: { bloques: Block[] }) {
  const hoy = new Date();
  const tramos = [0, 1, 2, 3].map((i) => {
    const desde = new Date(hoy);
    desde.setDate(hoy.getDate() + i * 7);
    const hasta = new Date(desde);
    hasta.setDate(desde.getDate() + 7);
    const n = bloques.filter((b) => {
      const fin = new Date(b.end_date);
      return b.status === "active" && fin >= desde && fin < hasta;
    }).length;
    return {
      n,
      etiqueta: i === 0 ? "Esta semana" : formatoCorto(desde),
    };
  });
  const max = Math.max(...tramos.map((t) => t.n), 1);

  return (
    <section className="card">
      <CardHead icon="calendar" title="Bloques que terminan" />
      <div className="card-body">
        <div className="bars">
          {tramos.map((t, i) => (
            <div className="bar-col" key={i}>
              <span className="bar-num num">{t.n}</span>
              <div
                className={`bar ${t.n === 0 ? "cero" : ""}`}
                style={{ height: `${(t.n / max) * 100}%` }}
              />
              <span className={`bar-label ${i === 0 ? "destacado" : ""}`}>
                {t.etiqueta}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function VistaAtleta({ bloques }: { bloques: Block[] }) {
  const activo = bloques.find((b) => b.status === "active");
  return (
    <section className="card">
      <CardHead icon="dumbbell" title="Tu bloque actual" />
      <div className="card-body">
        {activo ? (
          <Link to={`/bloques/${activo.id}`} className="spread">
            <span className="stack">
              <strong>{activo.name}</strong>
              <span className="muted">
                {activo.total_weeks} semanas · hasta el{" "}
                {formatoCorto(new Date(activo.end_date))}
              </span>
            </span>
            <Icon name="chevronRight" size={16} />
          </Link>
        ) : (
          <EmptyState
            icon="dumbbell"
            title="No tienes ningún bloque activo"
            text="Tu coach te asignará uno cuando esté listo."
          />
        )}
      </div>
    </section>
  );
}

export function formatoCorto(f: Date): string {
  return f.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}
