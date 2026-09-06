import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
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

  const { data: consentimiento } = useQuery({
    queryKey: ["consentimiento"],
    queryFn: api.consent,
  });

  const aceptar = useMutation({
    mutationFn: () => api.acceptConsent(VERSION_LEGAL, salud),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["consentimiento"] }),
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


    </>
  );
}
