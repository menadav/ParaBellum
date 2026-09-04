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
  /** El coach pide que grabe esta serie. */
  video_required: boolean;
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

export type Gender = "female" | "male" | "other";

export interface AthleteProfile {
  athlete_id: string;
  birth_date: string | null;
  age: number | null;
  phone: string | null;
  city: string | null;
  gender: Gender | null;
  height_cm: number | null;
  occupation: string | null;
  training_since: string | null;
  sports: string | null;
  injuries: string | null;
  nutrition: string | null;
  goals: string | null;
  priorities: string | null;
  best_squat: number | null;
  best_bench: number | null;
  best_deadlift: number | null;
  total: number | null;
  coach_note: string | null;
}

export type AthleteProfileIn = Omit<
  AthleteProfile,
  "athlete_id" | "age" | "total"
>;

export interface DefinitionIn {
  name: string;
  explanation: string;
  muscle_group?: string | null;
  video_url?: string | null;
  image_url?: string | null;
}
