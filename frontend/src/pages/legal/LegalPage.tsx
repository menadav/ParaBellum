import { Link } from "react-router-dom";
import { Monogram, Wordmark } from "../../components/Brand";
import {
  DOCUMENTOS,
  PENDIENTE,
  VERSION_LEGAL,
  type DocumentoLegal,
} from "./textos";
import "./legal.css";

// Pinta en rojo lo que queda por rellenar, para que no se publique
// ningun texto a medias sin que se vea a la primera.
function Parrafo({ texto }: { texto: string }) {
  const trozos = texto.split(PENDIENTE);
  return (
    <p>
      {trozos.map((trozo, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="pendiente">
            {trozo}
          </mark>
        ) : (
          <span key={i}>{trozo}</span>
        )
      )}
    </p>
  );
}

export function LegalPage({ documento }: { documento: DocumentoLegal }) {
  const sinRellenar = documento.secciones.some((s) =>
    s.parrafos.some((p) => PENDIENTE.test(p))
  );

  return (
    <div className="legal">
      <header className="legal-head">
        <Link to="/" className="legal-marca">
          <Monogram size={30} />
          <Wordmark height={26} />
        </Link>
        <nav className="legal-nav">
          {DOCUMENTOS.map((d) => (
            <Link
              key={d.ruta}
              to={d.ruta}
              className={d.ruta === documento.ruta ? "activo" : ""}
            >
              {d.titulo}
            </Link>
          ))}
        </nav>
      </header>

      <main className="legal-cuerpo">
        <h1>{documento.titulo}</h1>
        <p className="legal-entradilla">{documento.entradilla}</p>

        {sinRellenar && (
          <div className="legal-borrador">
            <strong>Borrador sin revisar.</strong> Lo marcado en rojo lo
            tiene que completar un profesional antes de que este texto
            valga como documento legal.
          </div>
        )}

        {documento.secciones.map((seccion) => (
          <section key={seccion.titulo}>
            <h2>{seccion.titulo}</h2>
            {seccion.parrafos.map((parrafo, i) => (
              <Parrafo key={i} texto={parrafo} />
            ))}
          </section>
        ))}

        <footer className="legal-pie">
          <span>Versión {VERSION_LEGAL}</span>
          <Link to="/">Volver a la aplicación</Link>
        </footer>
      </main>
    </div>
  );
}
