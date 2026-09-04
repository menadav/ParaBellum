import { useTheme } from "../theme";
import type { User } from "../lib/types";
import { iniciales } from "./Sidebar";
import "./topbar.css";

export function TopBar({ usuario }: { usuario: User }) {
  return (
    <header className="topbar">
      <ThemeToggle />
      <span className="topbar-user" title={usuario.email}>
        <span className="avatar">{iniciales(usuario.name)}</span>
      </span>
    </header>
  );
}

/** Tres estados: claro, oscuro y "lo que diga el sistema". */
function ThemeToggle() {
  const { tema, efectivo, setTema } = useTheme();

  const siguiente =
    tema === "system" ? "light" : tema === "light" ? "dark" : "system";

  const titulo =
    tema === "system"
      ? `Automático (${efectivo === "dark" ? "oscuro" : "claro"})`
      : tema === "light"
        ? "Modo claro"
        : "Modo oscuro";

  return (
    <button
      className="theme-toggle"
      onClick={() => setTema(siguiente)}
      title={titulo}
      aria-label={`Tema: ${titulo}. Pulsa para cambiar.`}
    >
      {tema === "system" ? <IconAuto /> : efectivo === "dark" ? <IconLuna /> : <IconSol />}
    </button>
  );
}

const svg = {
  width: 17,
  height: 17,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconSol() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function IconLuna() {
  return (
    <svg {...svg}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

function IconAuto() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18" />
      <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none" />
    </svg>
  );
}
