import { createContext, useContext, useEffect, useState } from "react";

type Tema = "light" | "dark" | "system";

const CLAVE = "parabellum:tema";
const Ctx = createContext<{
  tema: Tema;
  efectivo: "light" | "dark";
  setTema: (t: Tema) => void;
} | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [tema, setTema] = useState<Tema>(leerGuardado);
  const [sistemaOscuro, setSistemaOscuro] = useState(preferenciaOscura);

  // El sistema puede cambiar mientras la app esta abierta.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const alCambiar = (e: MediaQueryListEvent) => setSistemaOscuro(e.matches);
    mq.addEventListener("change", alCambiar);
    return () => mq.removeEventListener("change", alCambiar);
  }, []);

  useEffect(() => {
    const raiz = document.documentElement;
    if (tema === "system") raiz.removeAttribute("data-theme");
    else raiz.setAttribute("data-theme", tema);
    try {
      localStorage.setItem(CLAVE, tema);
    } catch {
      /* modo incognito */
    }
  }, [tema]);

  const efectivo = tema === "system" ? (sistemaOscuro ? "dark" : "light") : tema;

  return (
    <Ctx.Provider value={{ tema, efectivo, setTema }}>{children}</Ctx.Provider>
  );
}

export function useTheme() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTheme debe usarse dentro de <ThemeProvider>");
  return v;
}

function leerGuardado(): Tema {
  try {
    const v = localStorage.getItem(CLAVE);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* modo incognito */
  }
  return "system";
}

function preferenciaOscura(): boolean {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}
