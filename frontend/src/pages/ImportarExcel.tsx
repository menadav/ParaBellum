import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import type {
  ImportAnalysis,
  ImportBlock,
  ImportName,
  ImportResult,
  MapaNombres,
} from "../lib/types";
import { Icon } from "../components/Icon";
import { ErrorBox } from "../components/UI";
import "./importar.css";

type Paso = 1 | 2 | 3;

export function ImportarExcel({
  athleteId,
  athleteName,
  onCerrar,
}: {
  athleteId: string;
  athleteName: string;
  onCerrar: () => void;
}) {
  const qc = useQueryClient();
  const navegar = useNavigate();

  const [paso, setPaso] = useState<Paso>(1);
  const [fichero, setFichero] = useState<File | null>(null);
  const [analisis, setAnalisis] = useState<ImportAnalysis | null>(null);
  const [bloque, setBloque] = useState<ImportBlock | null>(null);
  const [mapa, setMapa] = useState<MapaNombres>({});
  const [inicio, setInicio] = useState("");
  const [nombre, setNombre] = useState("");
  const [previo, setPrevio] = useState<ImportResult | null>(null);

  const analizar = useMutation({
    mutationFn: (f: File) => api.analyzeExcel(f),
    onSuccess: (datos) => {
      setAnalisis(datos);
      setMapa(
        Object.fromEntries(
          datos.nombres.map((n) => [
            n.nombre_excel,
            { final: n.sugerido, grupo: n.grupo },
          ])
        )
      );
    },
  });

  const previsualizar = useMutation({
    mutationFn: () => enviar(false),
    onSuccess: (r) => {
      setPrevio(r);
      setPaso(3);
    },
  });

  const guardar = useMutation({
    mutationFn: () => enviar(true),
    onSuccess: (r) => {
      qc.invalidateQueries();
      navegar(`/bloques/${r.block_id}`);
    },
  });

  function enviar(deVerdad: boolean) {
    return api.commitExcel({
      fichero: fichero!,
      bloque: bloque!.numero,
      athlete_id: athleteId,
      mapa,
      nombre,
      inicio,
      guardar: deVerdad,
    });
  }

  function elegirFichero(f: File | null) {
    setFichero(f);
    setAnalisis(null);
    setBloque(null);
    setPrevio(null);
    if (f) analizar.mutate(f);
  }

  function elegirBloque(b: ImportBlock) {
    setBloque(b);
    setInicio(b.inicio ?? "");
    setNombre(`Bloque ${b.numero} (Excel)`);
  }

  const puedeSeguir = bloque !== null && (inicio !== "" || bloque.inicio !== null);

  return (
    <div className="importar-fondo" onClick={onCerrar}>
      <div className="importar" onClick={(e) => e.stopPropagation()}>
        <header className="importar-head">
          <div className="stack" style={{ gap: 2 }}>
            <h2>Importar desde Excel</h2>
            <span className="muted">
              Entra como bloque terminado en la ficha de {athleteName}.
            </span>
          </div>
          <button className="btn ghost" onClick={onCerrar}>
            Cerrar
          </button>
        </header>

        <ol className="importar-pasos">
          {["Elegir bloque", "Revisar ejercicios", "Confirmar"].map(
            (texto, i) => (
              <li
                key={texto}
                className={
                  paso === i + 1 ? "activo" : paso > i + 1 ? "hecho" : ""
                }
              >
                <span className="numero">
                  {paso > i + 1 ? <Icon name="check" size={13} /> : i + 1}
                </span>
                {texto}
              </li>
            )
          )}
        </ol>

        <div className="importar-cuerpo">
          {paso === 1 && (
            <PasoFichero
              fichero={fichero}
              analisis={analisis}
              bloque={bloque}
              inicio={inicio}
              cargando={analizar.isPending}
              error={analizar.error}
              onFichero={elegirFichero}
              onBloque={elegirBloque}
              onInicio={setInicio}
            />
          )}

          {paso === 2 && analisis && (
            <PasoNombres
              nombres={analisis.nombres}
              mapa={mapa}
              onCambiar={(excel, final) =>
                setMapa((m) => ({ ...m, [excel]: { ...m[excel], final } }))
              }
            />
          )}

          {paso === 3 && previo && bloque && (
            <PasoConfirmar
              previo={previo}
              bloque={bloque}
              atleta={athleteName}
              nombre={nombre}
              onNombre={setNombre}
            />
          )}
        </div>

        {(previsualizar.error || guardar.error) && (
          <ErrorBox error={previsualizar.error ?? guardar.error} />
        )}

        <footer className="importar-pie">
          {paso > 1 && (
            <button
              className="btn ghost"
              onClick={() => setPaso((p) => (p - 1) as Paso)}
            >
              Atrás
            </button>
          )}
          <span className="crece" />

          {paso === 1 && (
            <button
              className="btn"
              disabled={!puedeSeguir}
              onClick={() => setPaso(2)}
            >
              Revisar ejercicios
            </button>
          )}

          {paso === 2 && (
            <button
              className="btn"
              disabled={previsualizar.isPending}
              onClick={() => previsualizar.mutate()}
            >
              {previsualizar.isPending ? "Calculando…" : "Ver qué va a entrar"}
            </button>
          )}

          {paso === 3 && (
            <button
              className="btn"
              disabled={guardar.isPending}
              onClick={() => guardar.mutate()}
            >
              {guardar.isPending
                ? "Guardando…"
                : `Importar ${previo?.series ?? 0} series`}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

function PasoFichero({
  fichero,
  analisis,
  bloque,
  inicio,
  cargando,
  error,
  onFichero,
  onBloque,
  onInicio,
}: {
  fichero: File | null;
  analisis: ImportAnalysis | null;
  bloque: ImportBlock | null;
  inicio: string;
  cargando: boolean;
  error: unknown;
  onFichero: (f: File | null) => void;
  onBloque: (b: ImportBlock) => void;
  onInicio: (v: string) => void;
}) {
  return (
    <>
      <label className="soltar">
        <input
          type="file"
          accept=".xlsx,.xlsm"
          onChange={(e) => onFichero(e.target.files?.[0] ?? null)}
        />
        <Icon name="folder" size={22} />
        <span>
          {fichero ? fichero.name : "Elige el fichero .xlsx"}
          <span className="muted"> · solo se lee, no se guarda nada todavía</span>
        </span>
      </label>

      {cargando && <p className="muted">Leyendo el Excel…</p>}
      {error && <ErrorBox error={error} />}

      {analisis && (
        <>
          <p className="muted">
            {analisis.bloques.length} bloques y {analisis.nombres.length}{" "}
            ejercicios distintos. Elige uno:
          </p>
          <ul className="bloques">
            {analisis.bloques.map((b) => (
              <li key={b.numero}>
                <button
                  className={`bloque ${
                    bloque?.numero === b.numero ? "elegido" : ""
                  }`}
                  onClick={() => onBloque(b)}
                >
                  <strong>Bloque {b.numero}</strong>
                  <span className="cifras">
                    {b.semanas} semanas · {b.sesiones} sesiones ·{" "}
                    <b>{b.series} series</b>
                  </span>
                  <span className="muted">
                    {b.inicio
                      ? `Empieza el ${b.inicio}`
                      : "Sin fecha en el Excel"}
                    {b.avisos.length > 0 && ` · ${b.avisos.length} avisos`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {bloque && !bloque.inicio && (
        <label className="field">
          <span className="label">
            Este bloque no trae ninguna fecha. ¿Cuándo empezó?
          </span>
          <input
            className="input"
            type="date"
            value={inicio}
            onChange={(e) => onInicio(e.target.value)}
          />
        </label>
      )}

      {bloque && bloque.avisos.length > 0 && (
        <div className="avisos-excel">
          <strong>{bloque.avisos.length} cosas raras en el Excel</strong>
          <ul>
            {bloque.avisos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function PasoNombres({
  nombres,
  mapa,
  onCambiar,
}: {
  nombres: ImportName[];
  mapa: MapaNombres;
  onCambiar: (excel: string, final: string) => void;
}) {
  const [soloFusiones, setSoloFusiones] = useState(true);

  const fusionados = useMemo(
    () =>
      nombres.filter(
        (n) =>
          (mapa[n.nombre_excel]?.final ?? "").toLowerCase() !==
          n.nombre_excel.toLowerCase()
      ),
    [nombres, mapa]
  );

  const visibles = soloFusiones ? fusionados : nombres;

  return (
    <>
      <div className="aviso-fusion">
        <Icon name="alert" size={17} />
        <span>
          <strong>Revisa las fusiones.</strong> Se proponen juntando nombres
          parecidos, y eso se equivoca: <em>Abducción</em> y <em>Aducción</em>{" "}
          se parecen mucho como texto y son movimientos opuestos. Dos filas con
          el mismo nombre final acaban siendo un solo ejercicio.
        </span>
      </div>

      <label className="casilla">
        <input
          type="checkbox"
          checked={soloFusiones}
          onChange={(e) => setSoloFusiones(e.target.checked)}
        />
        <span>
          Ver solo lo que se va a fusionar ({fusionados.length} de{" "}
          {nombres.length})
        </span>
      </label>

      <ul className="nombres">
        {visibles.map((n) => {
          const final = mapa[n.nombre_excel]?.final ?? "";
          const fusion = final.toLowerCase() !== n.nombre_excel.toLowerCase();
          return (
            <li key={n.nombre_excel} className={fusion ? "fusion" : ""}>
              <span className="nombre-origen">
                {n.nombre_excel}
                <span className="muted"> ×{n.veces}</span>
              </span>
              <Icon name="chevronRight" size={14} />
              <input
                className="input"
                value={final}
                onChange={(e) => onCambiar(n.nombre_excel, e.target.value)}
              />
              {n.ya_en_catalogo && <span className="ya">ya existe</span>}
            </li>
          );
        })}
        {visibles.length === 0 && (
          <li className="muted">No se fusiona ningún nombre.</li>
        )}
      </ul>
    </>
  );
}

function PasoConfirmar({
  previo,
  bloque,
  atleta,
  nombre,
  onNombre,
}: {
  previo: ImportResult;
  bloque: ImportBlock;
  atleta: string;
  nombre: string;
  onNombre: (v: string) => void;
}) {
  const cifras: [string, number][] = [
    ["Semanas", previo.semanas],
    ["Sesiones", previo.sesiones],
    ["Ejercicios", previo.ejercicios],
    ["Series", previo.series],
    ["Nuevos en tu biblioteca", previo.definiciones_nuevas],
  ];

  return (
    <>
      <p className="muted">
        Se ha hecho la importación entera y luego se ha deshecho. Esto es
        exactamente lo que va a quedar:
      </p>

      <div className="resumen">
        {cifras.map(([etiqueta, valor]) => (
          <div key={etiqueta} className="cifra">
            <span className="numero-grande">{valor}</span>
            <span className="muted">{etiqueta}</span>
          </div>
        ))}
      </div>

      <label className="field">
        <span className="label">Cómo se va a llamar</span>
        <input
          className="input"
          value={nombre}
          maxLength={80}
          onChange={(e) => onNombre(e.target.value)}
        />
      </label>

      <p className="muted">
        Para <strong>{atleta}</strong>, empezando el{" "}
        <strong>{previo.inicio}</strong>, marcado como terminado.
        {bloque.avisos.length > 0 &&
          ` ${bloque.avisos.length} series con datos imposibles se han dejado sin ese valor.`}
      </p>
    </>
  );
}
