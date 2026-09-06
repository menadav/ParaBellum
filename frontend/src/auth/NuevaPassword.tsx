import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Wordmark } from "../components/Brand";
import "./login.css";
import "../pages/legal/legal.css";

const MINIMO = 8;

export function NuevaPassword() {
  const [listoParaCambiar, setListoParaCambiar] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [repetida, setRepetida] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [hecho, setHecho] = useState(false);

  // Al abrir el enlace del correo, Supabase deja una sesion temporal y
  // avisa con PASSWORD_RECOVERY. Sin eso no hay a quien cambiarle nada.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((evento, sesion) => {
      if (evento === "PASSWORD_RECOVERY" || sesion) setListoParaCambiar(true);
    });
    supabase.auth.getSession().then(({ data: actual }) => {
      setListoParaCambiar((previo) => previo ?? actual.session !== null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < MINIMO) {
      setError(`La contraseña tiene que tener al menos ${MINIMO} caracteres.`);
      return;
    }
    if (password !== repetida) {
      setError("Las dos contraseñas no coinciden.");
      return;
    }

    setGuardando(true);
    const { error: fallo } = await supabase.auth.updateUser({ password });
    setGuardando(false);

    if (fallo) {
      setError(
        fallo.message.includes("should be different")
          ? "Esa es la contraseña que ya tenías. Pon una distinta."
          : "No se ha podido cambiar. Pide el enlace otra vez."
      );
      return;
    }
    setHecho(true);
  }

  if (hecho)
    return (
      <div className="login">
        <div className="login-card">
          <div className="login-brand">
            <Wordmark height={44} />
          </div>
          <h2>Contraseña cambiada</h2>
          <p className="pista">
            Ya puedes entrar con la nueva. En los demás dispositivos tendrás
            que volver a entrar.
          </p>
          <a className="btn" href="/">
            Entrar
          </a>
        </div>
      </div>
    );

  if (listoParaCambiar === null)
    return (
      <div className="login">
        <div className="login-card">
          <p className="pista">Comprobando el enlace…</p>
        </div>
      </div>
    );

  if (!listoParaCambiar)
    return (
      <div className="login">
        <div className="login-card">
          <div className="login-brand">
            <Wordmark height={44} />
          </div>
          <h2>Este enlace ya no vale</h2>
          <p className="pista">
            Los enlaces caducan a la hora y solo se pueden usar una vez.
            Pide uno nuevo.
          </p>
          <Link className="btn" to="/recuperar">
            Pedir otro enlace
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
          <h2>Pon tu contraseña nueva</h2>
          <p className="pista">Mínimo {MINIMO} caracteres.</p>
        </div>

        <div className="stack" style={{ gap: "var(--sp-4)" }}>
          <label className="field">
            <span className="label">Nueva contraseña</span>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={MINIMO}
              required
              autoFocus
            />
          </label>

          <label className="field">
            <span className="label">Repítela</span>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              value={repetida}
              onChange={(e) => setRepetida(e.target.value)}
              required
            />
          </label>
        </div>

        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}

        <button className="btn" type="submit" disabled={guardando}>
          {guardando ? "Guardando…" : "Cambiar contraseña"}
        </button>
      </form>
    </div>
  );
}
