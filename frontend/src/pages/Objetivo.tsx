import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { PrescriptionIn, SetPrescription } from "../lib/types";
import { Icon } from "../components/Icon";
import { ErrorBox } from "../components/UI";
import "./objetivo.css";

// Lo que el coach le pide al atleta. El atleta lo ve y no lo toca: el
// backend le devuelve 403 si lo intenta.
export function Objetivo({
  exerciseId,
  workoutId,
  objetivos,
  editable,
}: {
  exerciseId: number;
  workoutId: number;
  objetivos: SetPrescription[];
  editable: boolean;
}) {
  const [editando, setEditando] = useState(false);

  if (objetivos.length === 0 && !editable) return null;

  if (editando)
    return (
      <EditarObjetivo
        exerciseId={exerciseId}
        workoutId={workoutId}
        objetivos={objetivos}
        onCerrar={() => setEditando(false)}
      />
    );

  if (objetivos.length === 0)
    return (
      <button className="objetivo-anadir" onClick={() => setEditando(true)}>
        <Icon name="plus" size={13} />
        Marcar objetivo
      </button>
    );

  return (
    <div className="objetivo">
      <span className="objetivo-etiqueta">Objetivo</span>
      <div className="objetivo-series">
        {objetivos.map((o) => (
          <span key={o.set_number} className="objetivo-chip">
            <b>{o.set_number}</b>
            {o.target_weight !== null && (
              <>
                {o.target_weight}
                <i>kg</i> ×{" "}
              </>
            )}
            {o.target_reps}
            {o.target_rpe !== null && <em> @{o.target_rpe}</em>}
          </span>
        ))}
      </div>
      {editable && (
        <button className="btn subtle sm" onClick={() => setEditando(true)}>
          Editar
        </button>
      )}
    </div>
  );
}

interface Fila {
  reps: string;
  peso: string;
  rpe: string;
}

const VACIA: Fila = { reps: "", peso: "", rpe: "" };

function EditarObjetivo({
  exerciseId,
  workoutId,
  objetivos,
  onCerrar,
}: {
  exerciseId: number;
  workoutId: number;
  objetivos: SetPrescription[];
  onCerrar: () => void;
}) {
  const qc = useQueryClient();
  const [filas, setFilas] = useState<Fila[]>(
    objetivos.length
      ? objetivos.map((o) => ({
          reps: String(o.target_reps),
          peso: o.target_weight?.toString() ?? "",
          rpe: o.target_rpe?.toString() ?? "",
        }))
      : []
  );

  const guardar = useMutation({
    mutationFn: () => {
      const sets: PrescriptionIn[] = filas
        .filter((f) => f.reps.trim() !== "")
        .map((f, i) => ({
          set_number: i + 1,
          target_reps: Number(f.reps),
          target_weight: f.peso.trim() === "" ? null : Number(f.peso),
          target_rpe: f.rpe.trim() === "" ? null : Number(f.rpe),
        }));
      return api.setPrescriptions(exerciseId, sets);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["objetivos", workoutId] });
      onCerrar();
    },
  });

  // Casi siempre son N series iguales: se generan de golpe y luego se
  // retoca la que haga falta en la tabla de abajo.
  const [cuantas, setCuantas] = useState("4");
  const [rapida, setRapida] = useState<Fila>({ ...VACIA });

  function generar() {
    const n = Math.min(Math.max(Number(cuantas) || 0, 1), 20);
    if (rapida.reps.trim() === "") return;
    setFilas((previas) => {
      const utiles = previas.filter((f) => f.reps.trim() !== "");
      return [...utiles, ...Array.from({ length: n }, () => ({ ...rapida }))];
    });
    setRapida({ ...VACIA });
  }

  const cambiar = (i: number, campo: keyof Fila, valor: string) =>
    setFilas((f) => f.map((x, j) => (j === i ? { ...x, [campo]: valor } : x)));

  // Repite la ultima: casi siempre son varias series iguales.
  const anadir = () =>
    setFilas((f) => [...f, f.length ? { ...f[f.length - 1] } : { ...VACIA }]);

  return (
    <div className="objetivo-editar">
      <div className="objetivo-rapida">
        <input
          className="input sm num contador"
          value={cuantas}
          inputMode="numeric"
          title="Cuántas series iguales"
          aria-label="Cuántas series iguales"
          onChange={(e) => setCuantas(e.target.value)}
        />
        <span>×</span>
        <input
          className="input"
          type="number"
          step="0.5"
          inputMode="decimal"
          placeholder="kg"
          value={rapida.peso}
          onChange={(e) => setRapida({ ...rapida, peso: e.target.value })}
        />
        <input
          className="input"
          type="number"
          inputMode="numeric"
          placeholder="reps"
          value={rapida.reps}
          onKeyDown={(e) => e.key === "Enter" && generar()}
          onChange={(e) => setRapida({ ...rapida, reps: e.target.value })}
        />
        <input
          className="input"
          type="number"
          step="0.5"
          min="1"
          max="10"
          inputMode="decimal"
          placeholder="RPE"
          value={rapida.rpe}
          onKeyDown={(e) => e.key === "Enter" && generar()}
          onChange={(e) => setRapida({ ...rapida, rpe: e.target.value })}
        />
        <button
          className="btn sm"
          disabled={rapida.reps.trim() === ""}
          onClick={generar}
        >
          Crear
        </button>
      </div>

      <div className="objetivo-tabla">
        <span className="muted">Serie</span>
        <span className="muted">Peso</span>
        <span className="muted">Reps</span>
        <span className="muted">RPE</span>
        <span />

        {filas.length === 0 && (
          <span className="muted objetivo-vacio">
            Escribe arriba cuántas series y con qué, y dale a Crear.
          </span>
        )}
        {filas.map((f, i) => (
          <Fragmento key={i}>
            <span className="num">{i + 1}</span>
            <input
              className="input"
              type="number"
              step="0.5"
              inputMode="decimal"
              placeholder="—"
              value={f.peso}
              onChange={(e) => cambiar(i, "peso", e.target.value)}
            />
            <input
              className="input"
              type="number"
              inputMode="numeric"
              placeholder="reps"
              value={f.reps}
              onChange={(e) => cambiar(i, "reps", e.target.value)}
            />
            <input
              className="input"
              type="number"
              step="0.5"
              min="1"
              max="10"
              inputMode="decimal"
              placeholder="—"
              value={f.rpe}
              onChange={(e) => cambiar(i, "rpe", e.target.value)}
            />
            <button
              className="btn subtle sm"
              aria-label={`Quitar la serie ${i + 1}`}
              onClick={() =>
                setFilas((x) => x.filter((_, j) => j !== i))
              }
            >
              ×
            </button>
          </Fragmento>
        ))}
      </div>

      {guardar.error && <ErrorBox error={guardar.error} />}

      <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
        <button className="btn subtle sm" onClick={anadir}>
          <Icon name="plus" size={13} />
          Serie
        </button>
        <span style={{ flex: 1 }} />
        <button
          className="btn sm"
          disabled={guardar.isPending}
          onClick={() => guardar.mutate()}
        >
          {guardar.isPending ? "Guardando…" : "Guardar objetivo"}
        </button>
        <button className="btn subtle sm" onClick={onCerrar}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

// La rejilla necesita las celdas sueltas, no envueltas en un div.
function Fragmento({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
