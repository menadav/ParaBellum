import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthProvider";
import type { User } from "../lib/types";
import { Icon } from "../components/Icon";
import { ErrorBox, StatusPill } from "../components/UI";
import { useTheme } from "../theme";
import { CambiarPassword } from "./CambiarPassword";

export function SettingsPage() {
  const usuario = useOutletContext<User>();
  const { salir } = useAuth();

  const salud = useQuery({
    queryKey: ["health"],
    queryFn: api.health,
    refetchInterval: 60_000,
  });

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div className="page-head">
        <div className="page-title">
          <h1>Ajustes</h1>
        </div>
      </div>

      <Perfil usuario={usuario} />
      <CambiarPassword usuario={usuario} />
      <Preferencias usuario={usuario} />

      <section className="card">
        <div className="card-body stack" style={{ gap: "var(--sp-4)" }}>
          <h2>Sistema</h2>
          <div className="spread">
            <span className="label">API</span>
            <span className={`pill ${salud.error ? "warn" : "ok"}`}>
              <span className="dot" />
              {salud.isLoading
                ? "comprobando…"
                : salud.error
                  ? "sin conexión"
                  : salud.data?.database}
            </span>
          </div>
          <Fila
            etiqueta="Servidor"
            valor={import.meta.env.VITE_API_URL ?? "localhost:8030"}
          />
        </div>
      </section>

      <section className="card">
        <div className="card-body spread">
          <div className="stack">
            <strong>Cerrar sesión</strong>
            <span className="muted celda-meta">
              Tendrás que volver a entrar con tu email
            </span>
          </div>
          <button className="btn ghost" onClick={salir}>
            <Icon name="logout" size={16} />
            Salir
          </button>
        </div>
      </section>
    </div>
  );
}

function Perfil({ usuario }: { usuario: User }) {
  const qc = useQueryClient();
  const [nombre, setNombre] = useState(usuario.name);

  const guardar = useMutation({
    mutationFn: () => api.updateMe({ name: nombre.trim() }),
    onSuccess: (nuevo) => {
      qc.setQueryData(["me"], nuevo);
      qc.invalidateQueries({ queryKey: ["atletas"] });
    },
  });

  const cambiado = nombre.trim() !== usuario.name && nombre.trim().length > 0;

  return (
    <section className="card">
      <div className="card-body stack" style={{ gap: "var(--sp-4)" }}>
        <div className="spread">
          <h2>Perfil</h2>
          {guardar.isSuccess && !cambiado && (
            <span className="pill ok">
              <span className="dot" />
              Guardado
            </span>
          )}
        </div>

        <label className="field">
          <span className="label">Nombre visible</span>
          <input
            className="input"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Cómo quieres que te vean"
            maxLength={80}
          />
        </label>

        <Fila etiqueta="Email" valor={usuario.email} />
        <Fila
          etiqueta="Rol"
          valor={usuario.role === "coach" ? "Entrenador" : "Atleta"}
        />
        <div className="spread">
          <span className="label">Estado</span>
          <StatusPill status={usuario.status} />
        </div>

        {guardar.error && <ErrorBox error={guardar.error} />}

        <div>
          <button
            className="btn"
            disabled={!cambiado || guardar.isPending}
            onClick={() => guardar.mutate()}
          >
            {guardar.isPending ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </section>
  );
}

function Preferencias({ usuario }: { usuario: User }) {
  const qc = useQueryClient();
  const { tema, setTema } = useTheme();

  const unidad = useMutation({
    mutationFn: (u: "kg" | "lb") => api.updateMe({ weight_unit: u }),
    onSuccess: (nuevo) => qc.setQueryData(["me"], nuevo),
  });

  return (
    <section className="card">
      <div className="card-body stack" style={{ gap: "var(--sp-4)" }}>
        <h2>Preferencias</h2>

        <div className="spread">
          <span className="label">Unidad de peso</span>
          <div className="segmento">
            {(["kg", "lb"] as const).map((u) => (
              <button
                key={u}
                className={usuario.weight_unit === u ? "on" : ""}
                disabled={unidad.isPending}
                onClick={() => unidad.mutate(u)}
              >
                {u.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="spread">
          <span className="label">Tema</span>
          <div className="segmento">
            {(
              [
                ["system", "Auto"],
                ["light", "Claro"],
                ["dark", "Oscuro"],
              ] as const
            ).map(([valor, texto]) => (
              <button
                key={valor}
                className={tema === valor ? "on" : ""}
                onClick={() => setTema(valor)}
              >
                {texto}
              </button>
            ))}
          </div>
        </div>

        {unidad.error && <ErrorBox error={unidad.error} />}
      </div>
    </section>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="spread">
      <span className="label">{etiqueta}</span>
      <span>{valor}</span>
    </div>
  );
}
