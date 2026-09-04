import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { Wordmark } from "../components/Brand";
import { ErrorBox, Spinner } from "../components/UI";
import "../auth/login.css";

interface InvitacionPublica {
  coach_name: string;
  name: string | null;
  email: string | null;
  usable: boolean;
  expired: boolean;
  accepted: boolean;
}

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8040";

// Esta pantalla se ve SIN sesion: quien abre el enlace todavia no
// tiene cuenta. Por eso llama a la API sin token.
export function InvitePage() {
  const { token = "" } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["invitacion", token],
    queryFn: async (): Promise<InvitacionPublica> => {
      const res = await fetch(`${BASE}/invitations/${token}`);
      if (!res.ok) throw new Error("Esta invitación no existe o ha caducado.");
      return res.json();
    },
    retry: false,
  });

  if (isLoading)
    return (
      <div className="login">
        <Spinner label="Comprobando la invitación…" />
      </div>
    );

  if (error || !data)
    return (
      <div className="login">
        <div className="login-card">
          <Wordmark height={40} />
          <ErrorBox error={error ?? new Error("Invitación no válida")} />
        </div>
      </div>
    );

  if (!data.usable)
    return (
      <div className="login">
        <div className="login-card">
          <Wordmark height={40} />
          <h2>
            {data.accepted
              ? "Esta invitación ya se ha usado"
              : "Esta invitación ha caducado"}
          </h2>
          <p className="pista">
            Pídele a {data.coach_name} que te mande una nueva.
          </p>
          <a className="btn" href="/">
            Ir a la aplicación
          </a>
        </div>
      </div>
    );

  return <Registro token={token} invitacion={data} />;
}

function Registro({
  token,
  invitacion,
}: {
  token: string;
  invitacion: InvitacionPublica;
}) {
  const [nombre, setNombre] = useState(invitacion.name ?? "");
  const [email, setEmail] = useState(invitacion.email ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);

    // El token viaja en los metadatos del registro. El trigger de la
    // base de datos lo lee y engancha el perfil a su coach en el mismo
    // momento del alta: no hay ningun instante en que quede suelto.
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: nombre.trim(), invitation_token: token } },
    });

    setEnviando(false);
    if (error) {
      setError(traducir(error.message));
      return;
    }
    // Sin sesion significa que Supabase pide confirmar el email.
    if (!data.session) {
      setListo(true);
      return;
    }
    window.location.href = "/";
  }

  if (listo)
    return (
      <div className="login">
        <div className="login-card">
          <Wordmark height={40} />
          <h2>Revisa tu correo</h2>
          <p className="pista">
            Te hemos enviado un enlace para confirmar tu cuenta. En cuanto
            lo abras podrás entrar.
          </p>
        </div>
      </div>
    );

  return (
    <div className="login">
      <form className="login-card" onSubmit={enviar}>
        <Wordmark height={40} />

        <div className="stack" style={{ gap: 4 }}>
          <h2>{invitacion.coach_name} te invita a entrenar</h2>
          <p className="pista">
            Crea tu cuenta y tendrás tus entrenos en el móvil.
          </p>
        </div>

        <div className="stack" style={{ gap: "var(--sp-4)" }}>
          <label className="field">
            <span className="label">Tu nombre</span>
            <input
              className="input"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre y apellidos"
              required
              autoFocus
            />
          </label>

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
            />
          </label>

          <label className="field">
            <span className="label">Contraseña</span>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              minLength={8}
              required
            />
          </label>
        </div>

        {error && <ErrorBox error={new Error(error)} />}

        <button className="btn" disabled={enviando}>
          {enviando ? "Creando tu cuenta…" : "Crear cuenta"}
        </button>
      </form>
    </div>
  );
}

function traducir(mensaje: string): string {
  if (mensaje.includes("already registered"))
    return "Ya hay una cuenta con ese email. Entra con ella.";
  if (mensaje.includes("at least"))
    return "La contraseña es demasiado corta.";
  if (mensaje.includes("valid email"))
    return "Ese email no parece válido.";
  return mensaje;
}
