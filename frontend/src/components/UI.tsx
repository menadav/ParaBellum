import { Icon, type IconName } from "./Icon";
import "./ui.css";

export function CardHead({
  icon,
  title,
  aside,
}: {
  icon: IconName;
  title: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="card-head">
      <span className="card-icon">
        <Icon name={icon} size={16} />
      </span>
      <span className="eyebrow grow">{title}</span>
      {aside && <span className="eyebrow">{aside}</span>}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tono =
    status === "active" || status === "completed"
      ? "ok"
      : status === "pending" || status === "draft"
        ? "warn"
        : "";
  return (
    <span className={`pill ${tono}`}>
      <span className="dot" />
      {ETIQUETAS[status] ?? status}
    </span>
  );
}

const ETIQUETAS: Record<string, string> = {
  active: "Activo",
  pending: "Pendiente",
  inactive: "Inactivo",
  draft: "Borrador",
  completed: "Completado",
  planned: "Planificado",
  in_progress: "En curso",
  skipped: "Saltado",
};

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: IconName;
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name={icon} size={22} />
      </span>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="spinner-wrap">
      <span className="spinner" aria-hidden="true" />
      {label && <span className="muted">{label}</span>}
    </div>
  );
}

export function ErrorBox({ error }: { error: unknown }) {
  return (
    <div className="errorbox" role="alert">
      <Icon name="alert" size={16} />
      <span>{(error as Error)?.message ?? "Algo ha fallado"}</span>
    </div>
  );
}

export function Meter({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="meter">
      <div className="spread">
        <span className="meter-label">{label}</span>
        <span className="meter-value num">{value}</span>
      </div>
      <div className="meter-track">
        <div className="meter-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Ring({
  value,
  total,
  caption,
}: {
  value: number;
  total: number;
  caption: string;
}) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? value / total : 0;
  return (
    <div className="ring-wrap">
      <svg width="128" height="128" viewBox="0 0 128 128">
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke="var(--line)"
          strokeWidth="10"
        />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          transform="rotate(-90 64 64)"
        />
        <text
          x="64"
          y="60"
          textAnchor="middle"
          className="ring-num"
          fill="var(--ink)"
        >
          {value}
        </text>
        <text
          x="64"
          y="78"
          textAnchor="middle"
          className="ring-cap"
          fill="var(--ink-3)"
        >
          {caption}
        </text>
      </svg>
    </div>
  );
}
