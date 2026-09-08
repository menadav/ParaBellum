import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import "./plegable.css";

// Una tarjeta que se abre y se cierra. Recuerda su estado para que la
// pagina siga como la dejaste al volver.
export function Plegable({
  id,
  titulo,
  resumen,
  icono,
  abiertoPorDefecto = false,
  children,
}: {
  id: string;
  titulo: string;
  resumen?: ReactNode;
  icono?: IconName;
  abiertoPorDefecto?: boolean;
  children: ReactNode;
}) {
  const [abierto, setAbierto] = useState(() => {
    const guardado = localStorage.getItem(`plegable-${id}`);
    return guardado === null ? abiertoPorDefecto : guardado === "1";
  });

  function alternar() {
    const nuevo = !abierto;
    setAbierto(nuevo);
    try {
      localStorage.setItem(`plegable-${id}`, nuevo ? "1" : "0");
    } catch {
      // Almacenamiento bloqueado: no se recuerda, pero abre igual.
    }
  }

  return (
    <section className="card plegable">
      <button
        className="plegable-head"
        onClick={alternar}
        aria-expanded={abierto}
      >
        <span className={`chevron ${abierto ? "abierto" : ""}`}>
          <Icon name="chevronRight" size={16} />
        </span>
        {icono && <Icon name={icono} size={16} />}
        <strong>{titulo}</strong>
        {!abierto && resumen && (
          <span className="muted plegable-resumen">{resumen}</span>
        )}
      </button>

      {abierto && <div className="plegable-cuerpo">{children}</div>}
    </section>
  );
}
