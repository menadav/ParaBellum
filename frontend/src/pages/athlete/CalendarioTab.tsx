import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { Block, User } from "../../lib/types";
import { Icon } from "../../components/Icon";
import { EmptyState, Spinner } from "../../components/UI";

const MESES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

/** Un año por semanas: cada casilla es un lunes, como los bloques. */
export function CalendarioTab() {
  const atleta = useOutletContext<User>();
  const [ano, setAno] = useState(new Date().getFullYear());

  const { data: bloques = [], isLoading } = useQuery({
    queryKey: ["bloquesAtleta", atleta.id],
    queryFn: () => api.athleteBlocks(atleta.id),
  });

  if (isLoading) return <Spinner />;

  const semanas = lunesDelAno(ano);
  const delAno = bloques.filter((b) => {
    const i = new Date(b.start_date).getFullYear();
    const f = new Date(b.end_date).getFullYear();
    return i <= ano && f >= ano;
  });

  return (
    <div className="stack" style={{ gap: "var(--sp-4)" }}>
      <div className="row" style={{ gap: "var(--sp-3)" }}>
        <button
          className="btn ghost sm"
          onClick={() => setAno(ano - 1)}
          aria-label="Año anterior"
        >
          <Icon name="chevronLeft" size={15} />
        </button>
        <strong className="num">{ano}</strong>
        <button
          className="btn ghost sm"
          onClick={() => setAno(ano + 1)}
          aria-label="Año siguiente"
        >
          <Icon name="chevronRight" size={15} />
        </button>
      </div>

      <section className="card">
        <div className="card-body" style={{ overflowX: "auto" }}>
          <div className="calendario">
            {semanas.map((lunes, i) => {
              const bloque = bloqueDeLaSemana(delAno, lunes);
              const nuevoMes =
                i === 0 || semanas[i - 1].getMonth() !== lunes.getMonth();
              const casilla = (
                <span
                  className={`cal-semana ${bloque ? "ocupada" : ""} ${
                    esLaSemanaActual(lunes) ? "hoy" : ""
                  }`}
                />
              );
              return (
                <div className="cal-col" key={i}>
                  <span className="cal-mes">
                    {nuevoMes ? MESES[lunes.getMonth()] : ""}
                  </span>
                  {bloque ? (
                    <Link
                      to={`/bloques/${bloque.id}`}
                      title={`${bloque.name} · semana del ${fechaCorta(lunes)}`}
                    >
                      {casilla}
                    </Link>
                  ) : (
                    <span title={fechaCorta(lunes)}>{casilla}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {delAno.length === 0 ? (
        <EmptyState
          icon="calendar"
          title={`Sin bloques en ${ano}`}
          text="Las casillas marcadas son las semanas con bloque asignado."
        />
      ) : (
        <section className="card">
          <div className="card-body">
            <ul className="lista-simple">
              {delAno.map((b) => (
                <li key={b.id}>
                  <Link to={`/bloques/${b.id}`} className="spread">
                    <span>{b.name}</span>
                    <span className="muted">
                      {b.total_weeks} semanas · desde el{" "}
                      {fechaCorta(new Date(b.start_date))}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

/** Todos los lunes del año: así se cuentan las semanas de entreno. */
function lunesDelAno(ano: number): Date[] {
  const d = new Date(ano, 0, 1);
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
  const salida: Date[] = [];
  while (d.getFullYear() === ano) {
    salida.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return salida;
}

function bloqueDeLaSemana(bloques: Block[], lunes: Date): Block | undefined {
  return bloques.find(
    (b) => lunes >= new Date(b.start_date) && lunes <= new Date(b.end_date)
  );
}

function esLaSemanaActual(lunes: Date): boolean {
  const hoy = new Date();
  const fin = new Date(lunes);
  fin.setDate(lunes.getDate() + 7);
  return hoy >= lunes && hoy < fin;
}

function fechaCorta(f: Date): string {
  return f.toLocaleDateString("es-ES");
}
