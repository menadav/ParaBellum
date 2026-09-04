import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Invitation } from "../lib/types";
import { Icon } from "../components/Icon";
import { CardHead, ErrorBox, Spinner } from "../components/UI";
import "./invitaciones.css";

export function InvitacionesCard() {
  const qc = useQueryClient();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");

  const { data: lista = [], isLoading } = useQuery({
    queryKey: ["invitaciones"],
    queryFn: api.invitations,
  });

  const crear = useMutation({
    mutationFn: () =>
      api.createInvitation({
        name: nombre.trim() || null,
        email: email.trim() || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invitaciones"] });
      setNombre("");
      setEmail("");
    },
  });

  const pendientes = lista.filter((i) => i.usable);
  const usadas = lista.filter((i) => i.accepted);

  return (
    <section className="card">
      <CardHead
        icon="userPlus"
        title="Invitar atletas"
        aside={pendientes.length ? `${pendientes.length} sin usar` : undefined}
      />
      <div className="card-body stack" style={{ gap: "var(--sp-4)" }}>
        <p className="pista">
          Crea un enlace y pásaselo a tu atleta por donde quieras. Al
          abrirlo se registra y queda a tu cargo automáticamente.
        </p>

        <form
          className="invitar-form"
          onSubmit={(e) => {
            e.preventDefault();
            crear.mutate();
          }}
        >
          <input
            className="input"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre (opcional)"
          />
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email (opcional)"
          />
          <button className="btn" disabled={crear.isPending}>
            <Icon name="plus" size={16} />
            {crear.isPending ? "Creando…" : "Crear enlace"}
          </button>
        </form>

        {crear.error && <ErrorBox error={crear.error} />}

        {isLoading ? (
          <Spinner />
        ) : pendientes.length === 0 ? (
          <p className="pista">No tienes invitaciones sin usar.</p>
        ) : (
          <ul className="invitaciones">
            {pendientes.map((i) => (
              <Fila key={i.id} invitacion={i} />
            ))}
          </ul>
        )}

        {usadas.length > 0 && (
          <p className="pista">
            {usadas.length} invitación{usadas.length === 1 ? "" : "es"} ya
            usada{usadas.length === 1 ? "" : "s"}.
          </p>
        )}
      </div>
    </section>
  );
}

function Fila({ invitacion }: { invitacion: Invitation }) {
  const qc = useQueryClient();
  const [copiado, setCopiado] = useState(false);

  const enlace = `${window.location.origin}/invitar/${invitacion.token}`;

  const revocar = useMutation({
    mutationFn: () => api.deleteInvitation(invitacion.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invitaciones"] }),
  });

  async function copiar() {
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles: el enlace se puede seleccionar.
    }
  }

  return (
    <li className="invitacion">
      <div className="stack" style={{ gap: 2, minWidth: 0 }}>
        <strong>{invitacion.name ?? invitacion.email ?? "Sin nombre"}</strong>
        <code className="invitacion-enlace">{enlace}</code>
      </div>
      <div className="row" style={{ gap: 4 }}>
        <button className="btn ghost sm" onClick={copiar}>
          {copiado ? (
            <>
              <Icon name="check" size={14} />
              Copiado
            </>
          ) : (
            "Copiar"
          )}
        </button>
        <button
          className="btn subtle sm"
          onClick={() => revocar.mutate()}
          disabled={revocar.isPending}
          title="Anular esta invitación"
          aria-label="Anular esta invitación"
        >
          <Icon name="trash" size={14} />
        </button>
      </div>
    </li>
  );
}
