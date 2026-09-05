
export type Role = "athlete" | "coach";
export type AthleteStatus = "pending" | "active" | "inactive";
export type BlockStatus = "draft" | "active" | "completed";
export type WorkoutStatus =
  | "planned"
  | "in_progress"
  | "completed"
  | "skipped";

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
  logged_by: string | null;
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

export interface Invitation {
  id: number;
  token: string;
  email: string | null;
  name: string | null;
  created_at: string | null;
  expires_at: string | null;
  accepted_at: string | null;
  accepted: boolean;
  expired: boolean;
  usable: boolean;
}

export interface BlockStats {
  workouts: number;
  exercises: number;
  logs: number;
}

export type NotificationKind = "info" | "payment" | "warning";

export interface Notification {
  id: number;
  kind: NotificationKind;
  title: string;
  body: string | null;
  created_at: string | null;
  read_at: string | null;
  expires_at: string | null;
}

export interface NotificationSent {
  batch: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  created_at: string;
  expires_at: string | null;
  total: number;
  leidos: number;
}

export interface Consent {
  terms_version: string | null;
  terms_accepted_at: string | null;
  health_consent_at: string | null;
  version_actual: string;
  al_dia: boolean;
}

export interface ImportBlock {
  numero: string;
  semanas: number;
  sesiones: number;
  ejercicios: number;
  series: number;
  inicio: string | null;
  avisos: string[];
}

export interface ImportName {
  nombre_excel: string;
  veces: number;
  tipo: string | null;
  sugerido: string;
  grupo: string | null;
  ya_en_catalogo: boolean;
}

export interface ImportAnalysis {
  fichero: string;
  bloques: ImportBlock[];
  nombres: ImportName[];
}

export interface ImportResult {
  block_id: number;
  nombre: string;
  semanas: number;
  sesiones: number;
  ejercicios: number;
  series: number;
  definiciones_nuevas: number;
  inicio: string;
  guardado: boolean;
}

export interface MapaNombres {
  [nombreExcel: string]: { final: string; grupo: string | null };
}

export interface RepeatWeekResult {
  origen: number;
  copiadas: number[];
  saltadas: number[];
  sesiones: number;
  ejercicios: number;
  series: number;
}
