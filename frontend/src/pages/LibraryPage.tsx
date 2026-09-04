import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { DefinitionIn, ExerciseDefinition, User } from "../lib/types";
import { Icon } from "../components/Icon";
import { EmptyState, ErrorBox, Spinner } from "../components/UI";

const VACIO: DefinitionIn = {
  name: "",
  explanation: "",
  muscle_group: null,
  video_url: null,
  image_url: null,
};

export function LibraryPage() {
  const usuario = useOutletContext<User>();
  const esCoach = usuario.role === "coach";
  const [q, setQ] = useState("");
  const [grupo, setGrupo] = useState<string | null>(null);
  const [editando, setEditando] = useState<ExerciseDefinition | "nuevo" | null>(
    null
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ["catalogo", q, grupo],
    queryFn: () => api.catalog(q, grupo ?? undefined),
  });

  const ejercicios = data ?? [];
  const grupos = [
    ...new Set(ejercicios.map((e) => e.muscle_group).filter(Boolean)),
  ] as string[];

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-title">
          <h1>Biblioteca</h1>
          <p>Tu catálogo de ejercicios, más los globales</p>
        </div>
        {esCoach && (
          <button className="btn" onClick={() => setEditando("nuevo")}>
            <Icon name="plus" size={16} />
            Nuevo ejercicio
          </button>
        )}
      </div>

      {editando && (
        <Editor
          inicial={editando === "nuevo" ? null : editando}
          onCerrar={() => setEditando(null)}
        />
      )}

      <div className="row" style={{ gap: "var(--sp-3)", flexWrap: "wrap" }}>
        <div
          className="sidebar-search"
          style={{ margin: 0, minWidth: 240, flex: 1, maxWidth: 360 }}
        >
          <Icon name="search" size={15} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar ejercicio"
          />
        </div>
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          <button
            className={`dia-btn ${grupo === null ? "on" : ""}`}
            onClick={() => setGrupo(null)}
          >
            Todos
          </button>
          {grupos.map((g) => (
            <button
              key={g}
              className={`dia-btn ${grupo === g ? "on" : ""}`}
              onClick={() => setGrupo(g)}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <section className="card">
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <div className="card-body">
            <ErrorBox error={error} />
          </div>
        ) : ejercicios.length === 0 ? (
          <EmptyState
            icon="folder"
            title="Sin ejercicios"
            text={
              esCoach
                ? "Crea el primero con el botón de arriba."
                : "Tu coach todavía no ha añadido ejercicios."
            }
          />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Ejercicio</th>
                <th>Grupo muscular</th>
                <th>Origen</th>
                {esCoach && <th />}
              </tr>
            </thead>
            <tbody>
              {ejercicios.map((e) => (
                <Fila
                  key={e.id}
                  definicion={e}
                  esCoach={esCoach}
                  esMio={e.coach_id === usuario.id}
                  onEditar={() => setEditando(e)}
                />
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function Fila({
  definicion,
  esCoach,
  esMio,
  onEditar,
}: {
  definicion: ExerciseDefinition;
  esCoach: boolean;
  esMio: boolean;
  onEditar: () => void;
}) {
  const qc = useQueryClient();
  const [confirmando, setConfirmando] = useState(false);

  const borrar = useMutation({
    mutationFn: () => api.deleteDefinition(definicion.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogo"] }),
  });

  return (
    <tr>
      <td>
        <strong>{definicion.name}</strong>
        {definicion.explanation && (
          <div className="muted celda-meta">{definicion.explanation}</div>
        )}
        {borrar.error && (
          <div style={{ marginTop: 8 }}>
            <ErrorBox error={borrar.error} />
          </div>
        )}
      </td>
      <td className="muted">{definicion.muscle_group ?? "—"}</td>
      <td>
        <span className="pill">{esMio ? "Tuyo" : "Global"}</span>
      </td>
      {esCoach && (
        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
          {esMio &&
            (confirmando ? (
              <span className="row" style={{ gap: 4, justifyContent: "flex-end" }}>
                <button
                  className="btn sm"
                  onClick={() => borrar.mutate()}
                  disabled={borrar.isPending}
                >
                  {borrar.isPending ? "…" : "Borrar"}
                </button>
                <button
                  className="btn subtle sm"
                  onClick={() => setConfirmando(false)}
                >
                  No
                </button>
              </span>
            ) : (
              <span className="row" style={{ gap: 4, justifyContent: "flex-end" }}>
                <button className="btn subtle sm" onClick={onEditar}>
                  Editar
                </button>
                <button
                  className="btn subtle sm"
                  onClick={() => setConfirmando(true)}
                  aria-label={`Borrar ${definicion.name}`}
                >
                  <Icon name="trash" size={14} />
                </button>
              </span>
            ))}
        </td>
      )}
    </tr>
  );
}

function Editor({
  inicial,
  onCerrar,
}: {
  inicial: ExerciseDefinition | null;
  onCerrar: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<DefinitionIn>(
    inicial
      ? {
          name: inicial.name,
          explanation: inicial.explanation,
          muscle_group: inicial.muscle_group,
          video_url: inicial.video_url,
          image_url: inicial.image_url,
        }
      : VACIO
  );

  const guardar = useMutation({
    mutationFn: () =>
      inicial
        ? api.updateDefinition(inicial.id, form)
        : api.createDefinition(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalogo"] });
      onCerrar();
    },
  });

  const set = (campo: keyof DefinitionIn, v: string) =>
    setForm((f) => ({ ...f, [campo]: v || null }));

  return (
    <section className="card">
      <form
        className="card-body stack"
        style={{ gap: "var(--sp-4)" }}
        onSubmit={(e) => {
          e.preventDefault();
          guardar.mutate();
        }}
      >
        <div className="spread">
          <h2>{inicial ? "Editar ejercicio" : "Nuevo ejercicio"}</h2>
          <button type="button" className="btn subtle sm" onClick={onCerrar}>
            Cancelar
          </button>
        </div>

        <div className="ficha-grid">
          <label className="field">
            <span className="label">Nombre</span>
            <input
              className="input"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Sentadilla con SSB"
              required
              autoFocus
            />
          </label>
          <label className="field">
            <span className="label">Grupo muscular</span>
            <input
              className="input"
              value={form.muscle_group ?? ""}
              onChange={(e) => set("muscle_group", e.target.value)}
              placeholder="cuadriceps"
            />
          </label>
          <label className="field ancho">
            <span className="label">Explicación técnica</span>
            <textarea
              className="input alto"
              rows={3}
              value={form.explanation}
              onChange={(e) => set("explanation", e.target.value)}
              placeholder="Barra alta, profundidad completa, sin rebote."
            />
          </label>
          <label className="field ancho">
            <span className="label">Vídeo (enlace de YouTube o Vimeo)</span>
            <input
              className="input"
              value={form.video_url ?? ""}
              onChange={(e) => set("video_url", e.target.value)}
              placeholder="https://youtu.be/…"
            />
          </label>
        </div>

        {guardar.error && <ErrorBox error={guardar.error} />}

        <div>
          <button
            className="btn"
            disabled={!form.name.trim() || guardar.isPending}
          >
            {guardar.isPending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </section>
  );
}
