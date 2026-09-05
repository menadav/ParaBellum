import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { supabase } from "../../lib/supabase";
import { Confirmar } from "../../components/Confirmar";
import { ErrorBox } from "../../components/UI";
import { VERSION_LEGAL } from "./textos";
import "./legal.css";

const FECHA: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "long",
  year: "numeric",
};

function cuando(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("es-ES", FECHA) : "—";
}

export function ConsentimientoCard() {
  const qc = useQueryClient();
  const [salud, setSalud] = useState(false);
  const [borrando, setBorrando] = useState(false);

  const { data: consentimiento } = useQuery({
    queryKey: ["consentimiento"],
    queryFn: api.consent,
  });

  const aceptar = useMutation({
    mutationFn: () => api.acceptConsent(VERSION_LEGAL, salud),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["consentimiento"] }),
  });

  const borrarCuenta = useMutation({
    mutationFn: api.deleteAccount,
    onSuccess: async () => {
      await supabase.auth.signOut();
      window.location.href = "/";
    },
  });

  if (!consentimiento) return null;

  const alDia = consentimiento.al_dia;
  const salvoSalud = consentimiento.health_consent_at !== null;

  return (
    <>
      <section className="card">
        <div className="card-body stack" style={{ gap: "var(--sp-4)" }}>
          <div className="stack" style={{ gap: 2 }}>
            <h2>Privacidad y condiciones</h2>
            <span className="muted">
              Qué aceptaste y cuándo. Los textos están siempre en{" "}
              <Link to="/privacidad">privacidad</Link>,{" "}
              <Link to="/terminos">términos</Link> y{" "}
              <Link to="/legal">aviso legal</Link>.
            </span>
          </div>

          <div className="spread">
            <span className="label">Condiciones aceptadas</span>
            <span className={`pill ${alDia ? "ok" : "warn"}`}>
              <span className="dot" />
              {alDia
                ? cuando(consentimiento.terms_accepted_at)
                : "Pendiente"}
            </span>
          </div>

          <div className="spread">
            <span className="label">Datos de salud</span>
            <span className={`pill ${salvoSalud ? "ok" : "warn"}`}>
              <span className="dot" />
              {salvoSalud
                ? cuando(consentimiento.health_consent_at)
                : "No autorizado"}
            </span>
          </div>

          {!alDia && (
            <div className="stack" style={{ gap: "var(--sp-3)" }}>
              <div className="consentimiento">
                <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                  {consentimiento.terms_version
                    ? "Los textos han cambiado desde que los aceptaste."
                    : "Tu cuenta es anterior a estos textos."}{" "}
                  Léelos y confirma para seguir usando la aplicación.
                </p>
                <label className="casilla">
                  <input
                    type="checkbox"
                    checked={salud}
                    onChange={(e) => setSalud(e.target.checked)}
                  />
                  <span>
                    Autorizo el tratamiento de mis datos de salud
                    (lesiones, molestias, peso y altura) para adaptar mi
                    entrenamiento.
                  </span>
                </label>
              </div>
              {aceptar.error && <ErrorBox error={aceptar.error} />}
              <button
                className="btn"
                disabled={aceptar.isPending}
                onClick={() => aceptar.mutate()}
              >
                {aceptar.isPending ? "Guardando…" : "Acepto las condiciones"}
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="card">
        <div className="card-body spread">
          <div className="stack">
            <strong>Borrar mi cuenta</strong>
            <span className="muted">
              Se borra tu perfil, tus bloques y todo tu historial de series.
              No se puede deshacer.
            </span>
          </div>
          <button className="btn ghost" onClick={() => setBorrando(true)}>
            Borrar
          </button>
        </div>
      </section>

      {borrando && (
        <Confirmar
          titulo="Borrar tu cuenta"
          descripcion="Desaparece todo: tu perfil, tus bloques, cada serie que has registrado y tus avisos. Nadie puede recuperarlo, ni tú ni tu entrenador. Si solo quieres una copia, descarga antes el Excel de cada bloque."
          escribir="BORRAR MI CUENTA"
          textoBoton="Borrar para siempre"
          cargando={borrarCuenta.isPending}
          error={borrarCuenta.error}
          onCancelar={() => setBorrando(false)}
          onConfirmar={() => borrarCuenta.mutate()}
        />
      )}
    </>
  );
}
