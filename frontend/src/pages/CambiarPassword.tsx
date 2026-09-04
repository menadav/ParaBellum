import { useState } from "react";
import { supabase } from "../lib/supabase";
import type { User } from "../lib/types";
import { ErrorBox } from "../components/UI";

// Todo va directo a Supabase Auth: nuestra API no ve nunca la contrasena.
export function CambiarPassword({ usuario }: { usuario: User }) {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const corta = nueva.length > 0 && nueva.length < 8;
  const distintas = repetida.length > 0 && nueva !== repetida;
  const igualQueLaActual = nueva.length > 0 && nueva === actual;
  const valida =
    actual.length > 0 &&
    nueva.length >= 8 &&
    nueva === repetida &&
    !igualQueLaActual;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setHecho(false);
    setEnviando(true);

    // 1. Comprobar que quien pide el cambio sabe la contraseña actual.
    //    Tener la sesion abierta no basta: si alguien se sienta en tu
    //    ordenador desbloqueado no puede dejarte fuera de tu cuenta.
    const { error: malActual } = await supabase.auth.signInWithPassword({
      email: usuario.email,
      password: actual,
    });
    if (malActual) {
      setEnviando(false);
      setError("La contraseña actual no es correcta.");
      return;
    }

    // 2. Ahora si, cambiarla.
    const { error: alCambiar } = await supabase.auth.updateUser({
      password: nueva,
    });

    setEnviando(false);
    if (alCambiar) {
      setError(traducir(alCambiar.message));
      return;
    }
    setActual("");
    setNueva("");
    setRepetida("");
    setHecho(true);
  }

  return (
    <section className="card">
      <form
        className="card-body stack"
        style={{ gap: "var(--sp-4)" }}
        onSubmit={enviar}
      >
        <div className="spread">
          <h2>Contraseña</h2>
          {hecho && (
            <span className="pill ok">
              <span className="dot" />
              Cambiada
            </span>
          )}
        </div>

        <label className="field">
          <span className="label">Contraseña actual</span>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="label">Nueva contraseña</span>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            placeholder="Mínimo 8 caracteres"
          />
          {corta && (
            <span className="pista error">
              Tiene que tener al menos 8 caracteres.
            </span>
          )}
          {igualQueLaActual && (
            <span className="pista error">
              La nueva tiene que ser distinta de la actual.
            </span>
          )}
        </label>

        <label className="field">
          <span className="label">Repítela</span>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            value={repetida}
            onChange={(e) => setRepetida(e.target.value)}
          />
          {distintas && (
            <span className="pista error">Las dos no coinciden.</span>
          )}
        </label>

        {error && <ErrorBox error={new Error(error)} />}

        <div>
          <button className="btn" disabled={!valida || enviando}>
            {enviando ? "Cambiando…" : "Cambiar contraseña"}
          </button>
        </div>

        <p className="pista">
          Seguirás con la sesión abierta aquí. En otros dispositivos
          tendrás que volver a entrar.
        </p>
      </form>
    </section>
  );
}

function traducir(mensaje: string): string {
  if (mensaje.includes("New password should be different"))
    return "La nueva contraseña tiene que ser distinta de la actual.";
  if (mensaje.includes("at least"))
    return "La contraseña es demasiado corta.";
  if (mensaje.includes("session"))
    return "Tu sesión ha caducado. Vuelve a entrar y prueba otra vez.";
  return mensaje;
}
