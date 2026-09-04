import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { ErrorBox } from "./UI";
import "./confirmar.css";

interface Props {
  titulo: string;
  descripcion: React.ReactNode;
  // Si viene, hay que teclearlo exacto para poder confirmar. Se usa
  // cuando lo que se borra no se puede recuperar de ninguna manera.
  escribir?: string;
  textoBoton?: string;
  cargando?: boolean;
  error?: unknown;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export function Confirmar({
  titulo,
  descripcion,
  escribir,
  textoBoton = "Borrar",
  cargando,
  error,
  onConfirmar,
  onCancelar,
}: Props) {
  const [texto, setTexto] = useState("");
  const listo = !escribir || texto.trim() === escribir;

  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancelar();
    };
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, [onCancelar]);

  return (
    <div
      className="modal-fondo"
      onClick={(e) => e.target === e.currentTarget && onCancelar()}
    >
      <div
        className="modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
      >
        <div className="modal-icono">
          <Icon name="alert" size={20} />
        </div>

        <h2 id="modal-titulo">{titulo}</h2>
        <div className="modal-texto">{descripcion}</div>

        {escribir && (
          <label className="field">
            <span className="label">
              Escribe <strong>{escribir}</strong> para confirmar
            </span>
            <input
              className="input"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              autoFocus
              autoComplete="off"
              spellCheck={false}
            />
          </label>
        )}

        {error != null && <ErrorBox error={error} />}

        <div className="modal-botones">
          <button className="btn ghost" onClick={onCancelar}>
            Cancelar
          </button>
          <button
            className="btn peligro"
            disabled={!listo || cargando}
            onClick={onConfirmar}
          >
            {cargando ? "Borrando…" : textoBoton}
          </button>
        </div>
      </div>
    </div>
  );
}
