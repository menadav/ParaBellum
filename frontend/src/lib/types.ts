/** Tipos que devuelve la API. Espejo de backend/src/api/schemas.py */

export type Role = "athlete" | "coach";
export type AthleteStatus = "pending" | "active" | "inactive";
export type BlockStatus = "draft" | "active" | "completed";
export type WorkoutStatus =
  | "planned"
  | "in_progress"
  | "completed"
  | "skipped";

/** 0 = lunes ... 6 = domingo */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  coach_id: string | null;
  status: AthleteStatus;
  weight_unit: "kg" | "lb";
}

export interface Block {
  id: number;
  name: string;
  coach_id: string;
  athlete_id: string;
  total_weeks: number;
  start_date: string;
  end_date: string;
  status: BlockStatus;
  notes: string | null;
}

export interface Workout {
  id: number;
  block_id: number;
  name: string;
  week_number: number;
  day_of_week: Weekday;
  status: WorkoutStatus;
  completed_at: string | null;
  athlete_notes: string | null;
}

export interface Exercise {
  id: number;
  workout_id: number;
  definition_id: number;
  position: number;
  superset_group: string | null;
  notes: string | null;
}

export interface ExerciseDefinition {
  id: number;
  name: string;
  explanation: string;
  coach_id: string | null;
  muscle_group: string | null;
  video_url: string | null;
  image_url: string | null;
}

export interface SetLog {
  id: number;
  exercise_id: number;
  set_number: number;
  reps: number;
  weight: number | null;
  rpe: number | null;
  completed_at: string | null;
  estimated_1rm: number | null;
  /** Quien la escribio. Si no es el atleta, esta pendiente. */
  logged_by: string | null;
}

export interface BlockCreate {
  name: string;
  athlete_id: string;
  total_weeks: number;
  start_date: string;
  notes?: string | null;
}

export interface WorkoutsGenerate {
  days: Weekday[];
  names?: string[] | null;
}

export interface SetPrescription {
  id: number;
  exercise_id: number;
  set_number: number;
  target_reps: number;
  target_weight: number | null;
  target_rpe: number | null;
}

export interface PrescriptionIn {
  set_number: number;
  target_reps: number;
  target_weight?: number | null;
  target_rpe?: number | null;
}
