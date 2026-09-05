import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Notification } from "../lib/types";
import { Icon, type IconName } from "./Icon";
import "./avisos.css";

const ESTILO: Record<string, { icono: IconName; etiqueta: string }> = {
  payment: { icono: "alert", etiqueta: "Pago" },
  warning: { icono: "alert", etiqueta: "Importante" },
  info: { icono: "inbox", etiqueta: "Aviso" },
};

export function Avisos() {
  const qc = useQueryClient();

  const { data: avisos = [] } = useQuery({
    queryKey: ["avisos"],
    queryFn: api.notifications,
    // Si el coach avisa mientras el atleta tiene la app abierta.
    refetchInterval: 120_000,
  });

  const leer = useMutation({
    mutationFn: api.readNotification,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["avisos"] }),
  });

  if (avisos.length === 0) return null;

  return (
    <div className="avisos" role="region" aria-label="Avisos de tu entrenador">
      {avisos.map((aviso: Notification) => {
        const estilo = ESTILO[aviso.kind] ?? ESTILO.info;
        return (
          <article key={aviso.id} className={`aviso ${aviso.kind}`}>
            <Icon name={estilo.icono} size={18} />
            <div className="aviso-texto">
              <p className="aviso-titulo">
                <span className="aviso-etiqueta">{estilo.etiqueta}</span>
                {aviso.title}
              </p>
              {aviso.body && <p className="aviso-cuerpo">{aviso.body}</p>}
            </div>
            <button
              className="aviso-cerrar"
              aria-label="Marcar como leído"
              title="Entendido"
              disabled={leer.isPending}
              onClick={() => leer.mutate(aviso.id)}
            >
              <Icon name="check" size={16} />
            </button>
          </article>
        );
      })}
    </div>
  );
}
