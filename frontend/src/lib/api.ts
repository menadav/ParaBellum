import { supabase } from "./supabase";
import type {
  Block,
  BlockCreate,
  Exercise,
  ExerciseDefinition,
  SetLog,
  User,
  Workout,
  WorkoutsGenerate,
} from "./types";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8030";

/** Error de la API con su codigo HTTP, para poder distinguir 403 de 404. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (!res.ok) {
    const cuerpo = await res.json().catch(() => null);
    throw new ApiError(res.status, mensajeDeError(cuerpo, res.status));
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

/** FastAPI devuelve el detalle como texto (HTTPException) o como lista (validacion). */
function mensajeDeError(cuerpo: unknown, status: number): string {
  const detalle = (cuerpo as { detail?: unknown })?.detail;
  if (typeof detalle === "string") return detalle;
  if (Array.isArray(detalle) && detalle.length > 0) {
    return detalle.map((e) => e.msg ?? String(e)).join(". ");
  }
  return `Error ${status}`;
}

const get = <T>(path: string) => request<T>(path);
const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "POST", body: JSON.stringify(body) });
const patch = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
const put = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "PUT", body: JSON.stringify(body) });

export const api = {
  me: () => get<User>("/me"),
  updateMe: (body: { name?: string; weight_unit?: "kg" | "lb" }) =>
    patch<User>("/me", body),
  athletes: () => get<User[]>("/me/athletes"),

  myBlocks: () => get<Block[]>("/me/blocks"),
  activeBlock: () => get<Block>("/me/blocks/active"),
  athleteBlocks: (athleteId: string) =>
    get<Block[]>(`/athletes/${athleteId}/blocks`),
  block: (id: number) => get<Block>(`/blocks/${id}`),
  createBlock: (body: BlockCreate) => post<Block>("/blocks", body),
  setBlockStatus: (id: number, status: Block["status"]) =>
    patch<Block>(`/blocks/${id}/status`, { status }),

  workouts: (blockId: number, week?: number) =>
    get<Workout[]>(
      `/blocks/${blockId}/workouts${week ? `?week=${week}` : ""}`
    ),
  generateWorkouts: (blockId: number, body: WorkoutsGenerate) =>
    post<Workout[]>(`/blocks/${blockId}/workouts`, body),

  exercises: (workoutId: number) =>
    get<Exercise[]>(`/workouts/${workoutId}/exercises`),
  addExercise: (workoutId: number, definitionId: number) =>
    post<Exercise>(`/workouts/${workoutId}/exercises`, {
      definition_id: definitionId,
    }),

  catalog: (q = "", muscleGroup?: string) =>
    get<ExerciseDefinition[]>(
      `/exercise-definitions?q=${encodeURIComponent(q)}` +
        (muscleGroup ? `&muscle_group=${encodeURIComponent(muscleGroup)}` : "")
    ),

  logs: (workoutId: number) => get<SetLog[]>(`/workouts/${workoutId}/logs`),
  saveLog: (
    exerciseId: number,
    setNumber: number,
    body: { reps: number; weight?: number | null; rpe?: number | null }
  ) =>
    put<SetLog>(`/exercises/${exerciseId}/logs/${setNumber}`, {
      set_number: setNumber,
      ...body,
    }),

  health: () => get<{ status: string; database: string }>("/health"),
};
