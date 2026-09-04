import { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

interface AuthValue {
  session: Session | null;
  cargando: boolean;
  entrar: (email: string, password: string) => Promise<void>;
  salir: () => Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCargando(false);
    });
    // Se dispara al entrar, al salir y cada vez que el token se renueva solo.
    const { data } = supabase.auth.onAuthStateChange((_e, s) =>
      setSession(s)
    );
    return () => data.subscription.unsubscribe();
  }, []);

  const entrar = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error(traducir(error.message));
  };

  const salir = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider value={{ session, cargando, entrar, salir }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return v;
}

function traducir(mensaje: string): string {
  if (mensaje.includes("Invalid login credentials"))
    return "Email o contraseña incorrectos.";
  if (mensaje.includes("Email not confirmed"))
    return "Tienes que confirmar tu email antes de entrar.";
  return mensaje;
}
