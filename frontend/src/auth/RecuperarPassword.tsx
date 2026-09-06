import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Wordmark } from "../components/Brand";
import "./login.css";
import "../pages/legal/legal.css";

// A donde vuelve el enlace del correo. Tiene que estar en la lista de
// "Redirect URLs" de Supabase o el enlace no llevara a ninguna parte.
const VUELTA = `${window.location.origin}/nueva-password`;

export function RecuperarPassword() {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);

    const { error: fallo } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: VUELTA }
    );
    setEnviando(false);

    if (fallo) {
      setError(
        fallo.message.includes("rate")
          ? "Demasiados intentos seguidos. Espera unos minutos."
          : "No se ha podido enviar el correo. Inténtalo más tarde."
      );
      return;
    }
    setEnviado(true);
  }

  if (enviado)
    return (
      <div className="login">
        <div className="login-card">
          <div className="login-brand">
            <Wordmark height={44} />
          </div>
          <h2>Mira tu correo</h2>
          <p className="pista">
            Si hay una cuenta con <strong>{email.trim()}</strong>, le acaba de
            llegar un enlace para poner una contraseña nueva. Caduca en una
            hora.
          </p>
          <p className="pista">
            Si no lo ves, mira en spam antes de volver a pedirlo.
          </p>
          <Link className="btn ghost" to="/">
            Volver a entrar
          </Link>
        </div>
      </div>
    );

  return (
    <div className="login">
      <form className="login-card" onSubmit={enviar}>
        <div className="login-brand">
          <Wordmark height={44} />
        </div>

        <div className="stack" style={{ gap: 4 }}>
          <h2>Recuperar tu contraseña</h2>
          <p className="pista">
            Escribe tu email y te mandamos un enlace para ponerte una nueva.
          </p>
        </div>

        <label className="field">
          <span className="label">Email</span>
          <input
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
            autoFocus
          />
        </label>

        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}

        <button className="btn" type="submit" disabled={enviando}>
          {enviando ? "Enviando…" : "Enviarme el enlace"}
        </button>

        <div className="legal-enlaces">
          <Link to="/">Volver a entrar</Link>
        </div>
      </form>
    </div>
  );
}
