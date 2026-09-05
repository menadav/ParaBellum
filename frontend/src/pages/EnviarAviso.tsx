import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { NotificationKind, NotificationSent } from "../lib/types";
import { Confirmar } from "../components/Confirmar";
import { Icon } from "../components/Icon";
import { ErrorBox } from "../components/UI";
import { iniciales } from "../components/Sidebar";
import "../components/avisos.css";

const TIPOS: { valor: NotificationKind; etiqueta: string }[] = [
  { valor: "payment", etiqueta: "Pago" },
  { valor: "info", etiqueta: "Aviso" },
  { valor: "warning", etiqueta: "Importante" },
];

export function EnviarAviso() {
  const qc = useQueryClient();
  const [kind, setKind] = useState<NotificationKind>("payment");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [retirar, setRetirar] = useState<NotificationSent | null>(null);

  const { data: atletas = [] } = useQuery({
    queryKey: ["atletas"],
    queryFn: api.athletes,
  });
  const { data: enviados = [] } = useQuery({
    queryKey: ["avisosEnviados"],
    queryFn: api.sentNotifications,
  });

  const refrescar = () =>
    qc.invalidateQueries({ queryKey: ["avisosEnviados"] });

  const enviar = useMutation({
    mutationFn: () =>
      api.sendNotification({
        athlete_ids: elegidos.length ? elegidos : null,
        kind,
        title: title.trim(),
        body: body.trim() || null,
      }),
    onSuccess: () => {
      setTitle("");
      setBody("");
      setElegidos([]);
      refrescar();
    },
  });

  const borrar = useMutation({
    mutationFn: (batch: string) => api.deleteNotification(batch),
    onSuccess: () => {
      setRetirar(null);
      refrescar();
    },
  });

  const alternar = (id: string) =>
    setElegidos((previos) =>
      previos.includes(id)
        ? previos.filter((x) => x !== id)
        : [...previos, id]
    );

  const aTodos = elegidos.length === 0;
  const cuantos = aTodos ? atletas.length : elegidos.length;

  return (
    <div className="card">
      <div className="card-head">
        <h2>Avisar a tus atletas</h2>
        <p className="muted">
          Les aparece nada más entrar en la app, hasta que lo marcan como
          leído.
        </p>
      </div>

      <div className="enviar-aviso">
        <div className="tipos">
          {TIPOS.map((t) => (
            <button
              key={t.valor}
              type="button"
              className={`tipo ${kind === t.valor ? "activo" : ""}`}
              onClick={() => setKind(t.valor)}
            >
              {t.etiqueta}
            </button>
          ))}
        </div>

        <label className="field">
          <span className="label">Título</span>
          <input
            value={title}
            maxLength={120}
            placeholder="Recuerda la mensualidad de octubre"
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="label">Detalle (opcional)</span>
          <textarea
            value={body}
            rows={3}
            maxLength={1000}
            placeholder="Antes del día 5, por el método de siempre."
            onChange={(e) => setBody(e.target.value)}
          />
        </label>

        <div className="field">
          <span className="label">
            Para quién ·{" "}
            {aTodos ? "todos tus atletas" : `${elegidos.length} elegidos`}
          </span>
          <div className="destinatarios">
            {atletas.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`destinatario ${
                  elegidos.includes(a.id) ? "elegido" : ""
                }`}
                onClick={() => alternar(a.id)}
              >
                <span className="avatar" style={{ width: 20, height: 20 }}>
                  {iniciales(a.name)}
                </span>
                {a.name}
              </button>
            ))}
            {atletas.length === 0 && (
              <span className="muted">Todavía no tienes atletas</span>
            )}
          </div>
        </div>

        {enviar.error && <ErrorBox error={enviar.error} />}

        <button
          className="btn"
          disabled={!title.trim() || cuantos === 0 || enviar.isPending}
          onClick={() => enviar.mutate()}
        >
          {enviar.isPending
            ? "Enviando…"
            : `Enviar a ${cuantos} ${cuantos === 1 ? "atleta" : "atletas"}`}
        </button>
      </div>

      {enviados.length > 0 && (
        <>
          <h3 style={{ marginTop: "var(--sp-5)" }}>Enviados</h3>
          <ul className="enviados">
            {enviados.map((e) => (
              <li key={e.batch} className="enviado">
                <span>
                  <strong>{e.title}</strong>
                  {e.body && <div className="muted">{e.body}</div>}
                </span>
                <span className="enviado-leidos">
                  {e.leidos}/{e.total} leídos
                </span>
                <button
                  className="btn ghost"
                  title="Retirarlo de todos"
                  onClick={() => setRetirar(e)}
                >
                  <Icon name="trash" size={15} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {retirar && (
        <Confirmar
          titulo="Retirar el aviso"
          descripcion={`Desaparecerá de los ${retirar.total} atletas a los que se envió, lo hayan leído o no.`}
          escribir="RETIRAR"
          textoBoton="Retirar"
          cargando={borrar.isPending}
          error={borrar.error}
          onCancelar={() => setRetirar(null)}
          onConfirmar={() => borrar.mutate(retirar.batch)}
        />
      )}
    </div>
  );
}
