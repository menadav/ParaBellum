import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { AthleteProfileIn, Gender, User } from "../../lib/types";
import { ErrorBox, Spinner } from "../../components/UI";

const VACIA: AthleteProfileIn = {
  birth_date: null,
  phone: null,
  city: null,
  gender: null,
  height_cm: null,
  occupation: null,
  training_since: null,
  sports: null,
  injuries: null,
  nutrition: null,
  goals: null,
  priorities: null,
  best_squat: null,
  best_bench: null,
  best_deadlift: null,
  coach_note: null,
};

export function FichaTab() {
  const atleta = useOutletContext<User>();
  const qc = useQueryClient();
  const [form, setForm] = useState<AthleteProfileIn>(VACIA);

  const { data, isLoading, error } = useQuery({
    queryKey: ["ficha", atleta.id],
    queryFn: () => api.athleteProfile(atleta.id),
  });

  // Solo al llegar los datos: despues manda lo que el coach escriba.
  useEffect(() => {
    if (data) {
      const { athlete_id, age, total, ...resto } = data;
      void athlete_id;
      void age;
      void total;
      setForm(resto);
    }
  }, [data]);

  const guardar = useMutation({
    mutationFn: () => api.saveAthleteProfile(atleta.id, form),
    onSuccess: (nuevo) => qc.setQueryData(["ficha", atleta.id], nuevo),
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBox error={error} />;

  const set = <K extends keyof AthleteProfileIn>(
    campo: K,
    valor: AthleteProfileIn[K]
  ) => setForm((f) => ({ ...f, [campo]: valor }));

  const texto = (campo: keyof AthleteProfileIn) => ({
    value: (form[campo] as string) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      set(campo, (e.target.value || null) as AthleteProfileIn[typeof campo]),
  });

  const numero = (campo: keyof AthleteProfileIn) => ({
    value: (form[campo] as number | null)?.toString() ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      set(
        campo,
        (e.target.value === ""
          ? null
          : Number(e.target.value)) as AthleteProfileIn[typeof campo]
      ),
  });

  return (
    <div className="stack" style={{ gap: "var(--sp-5)" }}>
      <section className="card">
        <div className="card-body stack" style={{ gap: "var(--sp-4)" }}>
          <h2>Datos personales</h2>
          <div className="ficha-grid">
            <Campo label="Fecha de nacimiento">
              <input className="input" type="date" {...texto("birth_date")} />
            </Campo>
            <Campo label={`Edad${data?.age ? "" : ""}`}>
              <input
                className="input num"
                value={data?.age ?? ""}
                readOnly
                placeholder="—"
              />
            </Campo>
            <Campo label="Teléfono">
              <input className="input" {...texto("phone")} placeholder="600…" />
            </Campo>
            <Campo label="Ciudad">
              <input className="input" {...texto("city")} />
            </Campo>
            <Campo label="Altura (cm)">
              <input className="input num" {...numero("height_cm")} />
            </Campo>
            <Campo label="Género">
              <div className="segmento">
                {(
                  [
                    ["female", "Mujer"],
                    ["male", "Hombre"],
                    ["other", "Otro"],
                  ] as [Gender, string][]
                ).map(([v, t]) => (
                  <button
                    key={v}
                    type="button"
                    className={form.gender === v ? "on" : ""}
                    onClick={() => set("gender", form.gender === v ? null : v)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Campo>
            <Campo label="Estudios / trabajo" ancho>
              <input className="input" {...texto("occupation")} />
            </Campo>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-body stack" style={{ gap: "var(--sp-4)" }}>
          <div className="spread">
            <h2>Marcas de referencia</h2>
            {data?.total != null && (
              <span className="pill">Total {data.total} kg</span>
            )}
          </div>
          <div className="ficha-grid">
            <Campo label="Sentadilla (kg)">
              <input className="input num" {...numero("best_squat")} />
            </Campo>
            <Campo label="Press banca (kg)">
              <input className="input num" {...numero("best_bench")} />
            </Campo>
            <Campo label="Peso muerto (kg)">
              <input className="input num" {...numero("best_deadlift")} />
            </Campo>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-body stack" style={{ gap: "var(--sp-4)" }}>
          <h2>Historial</h2>
          <Campo label="Tiempo entrenando" ancho>
            <input className="input" {...texto("training_since")} />
          </Campo>
          <Campo label="Deportes que practica" ancho>
            <textarea className="input alto" rows={2} {...texto("sports")} />
          </Campo>
          <Campo label="Lesiones, molestias, operaciones" ancho>
            <textarea className="input alto" rows={3} {...texto("injuries")} />
          </Campo>
          <Campo label="Alimentación" ancho>
            <textarea className="input alto" rows={2} {...texto("nutrition")} />
          </Campo>
          <Campo label="Objetivos" ancho>
            <textarea className="input alto" rows={2} {...texto("goals")} />
          </Campo>
          <Campo label="Prioridades en su vida" ancho>
            <textarea className="input alto" rows={2} {...texto("priorities")} />
          </Campo>
        </div>
      </section>

      <section className="card">
        <div className="card-body stack" style={{ gap: "var(--sp-4)" }}>
          <div className="spread">
            <h2>Nota privada</h2>
            <span className="pill warn">
              <span className="dot" />
              El atleta no la ve
            </span>
          </div>
          <textarea
            className="input alto"
            rows={3}
            {...texto("coach_note")}
            placeholder="Para ti: observaciones, historial de conversaciones…"
          />
        </div>
      </section>

      {guardar.error && <ErrorBox error={guardar.error} />}

      <div className="row" style={{ gap: "var(--sp-3)" }}>
        <button
          className="btn"
          disabled={guardar.isPending}
          onClick={() => guardar.mutate()}
        >
          {guardar.isPending ? "Guardando…" : "Guardar ficha"}
        </button>
        {guardar.isSuccess && (
          <span className="pill ok">
            <span className="dot" />
            Guardada
          </span>
        )}
      </div>
    </div>
  );
}

function Campo({
  label,
  children,
  ancho,
}: {
  label: string;
  children: React.ReactNode;
  ancho?: boolean;
}) {
  return (
    <label className={`field ${ancho ? "ancho" : ""}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
