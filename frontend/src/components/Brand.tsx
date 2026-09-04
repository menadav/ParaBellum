import { useState } from "react";
import "./brand.css";

/**
 * Marca de Para Bellum.
 *
 * Si existen las imagenes en frontend/public se usan; si no, cae en un
 * dibujo hecho a mano para que la app nunca se quede sin logo.
 *
 *   public/wordmark.png   el "PARA BELLUM COACHING" completo
 *   public/monogram.png   la PB, cuadrada
 *
 * Guardalas con fondo TRANSPARENTE: en modo oscuro se invierten a
 * blanco, y con fondo blanco se veria un recuadro.
 */

export function Wordmark({ height = 34 }: { height?: number }) {
  const [falla, setFalla] = useState(false);
  if (falla) return <WordmarkFallback height={height} />;
  return (
    <img
      className="marca marca-invertible"
      src="/wordmark.png"
      alt="Para Bellum Coaching"
      style={{ height }}
      onError={() => setFalla(true)}
    />
  );
}

export function Monogram({ size = 26 }: { size?: number }) {
  const [falla, setFalla] = useState(false);
  if (falla) return <MonogramFallback size={size} />;
  return (
    <img
      className="marca marca-invertible"
      src="/monogram.png"
      alt=""
      width={size}
      height={size}
      onError={() => setFalla(true)}
    />
  );
}

function WordmarkFallback({ height }: { height: number }) {
  return (
    <span className="marca-texto" style={{ fontSize: height * 0.42 }}>
      <span className="marca-nombre">PARA BELLUM</span>
      <span className="marca-sub">COACHING</span>
    </span>
  );
}

function MonogramFallback({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 18 11 5h3l-7 13z" fill="currentColor" />
      <path d="M11 18 18 5h3l-7 13z" fill="var(--accent)" />
    </svg>
  );
}
