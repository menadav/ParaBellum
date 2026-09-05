import { useState } from "react";
import { Link } from "react-router-dom";
import { Wordmark } from "../components/Brand";
import { useAuth } from "./AuthProvider";
import "./login.css";
import "../pages/legal/legal.css";

export function LoginPage() {
  const { entrar } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await entrar(email.trim(), password);
    } catch (err) {
      setError((err as Error).message);
      setEnviando(false);
    }
  }

  return (
    <div className="login">
      <form className="login-card" onSubmit={enviar}>
        <div className="login-brand">
          <Wordmark height={44} />
        </div>

        <div className="stack" style={{ gap: "var(--sp-4)" }}>
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

          <label className="field">
            <span className="label">Contraseña</span>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>
        </div>

        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}

        <button className="btn" type="submit" disabled={enviando}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>
        <div className="legal-enlaces">
          <Link to="/legal">Aviso legal</Link>
          <span>·</span>
          <Link to="/privacidad">Privacidad</Link>
          <span>·</span>
          <Link to="/terminos">Términos</Link>
        </div>
      </form>
    </div>
  );
}
