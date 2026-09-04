import datetime
import uuid
from pydantic import BaseModel, ConfigDict, Field, field_validator
from models import (
    AthleteStatus, BlockStatus, Gender, Role, Weekday, WeightUnit,
    WorkoutStatus,
)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    email: str
    role: Role
    coach_id: uuid.UUID | None
    status: AthleteStatus
    weight_unit: WeightUnit


class BlockOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    coach_id: uuid.UUID
    athlete_id: uuid.UUID
    total_weeks: int
    start_date: datetime.date
    end_date: datetime.date
    status: BlockStatus
    notes: str | None


class WorkoutOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    block_id: int
    name: str
    week_number: int
    day_of_week: Weekday
    status: WorkoutStatus
    completed_at: datetime.datetime | None
    athlete_notes: str | None


class SetLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    exercise_id: int
    set_number: int
    reps: int
    weight: float | None
    rpe: float | None
    completed_at: datetime.datetime | None
    estimated_1rm: float | None
    logged_by: uuid.UUID | None
    video_required: bool


class ExerciseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    workout_id: int
    definition_id: int
    position: int
    superset_group: str | None
    notes: str | None


class ExerciseDefinitionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    explanation: str
    coach_id: uuid.UUID | None
    muscle_group: str | None
    video_url: str | None
    image_url: str | None


# ---------------------------------------------------------------------
# Esquemas de ENTRADA: lo que la API recibe.
#
# Aqui es donde Pydantic gana de verdad. Cada Field() con sus limites
# es una validacion que se aplica ANTES de que corra tu codigo. Si el
# cliente manda total_weeks=99, FastAPI responde 422 con el motivo y
# tu endpoint ni se entera.
#
# Fijate en que NO llevan id: lo pone Postgres.
# ---------------------------------------------------------------------


class BlockCreate(BaseModel):

    name: str = Field(min_length=1, max_length=120)
    athlete_id: uuid.UUID
    total_weeks: int = Field(ge=1, le=52)
    start_date: datetime.date
    notes: str | None = None

    @field_validator("start_date")
    @classmethod
    def tiene_que_ser_lunes(cls, v: datetime.date) -> datetime.date:
        if v.weekday() != 0:
            dias = ["lunes", "martes", "miercoles", "jueves",
                    "viernes", "sabado", "domingo"]
            raise ValueError(
                f"Un bloque empieza en lunes. {v} es {dias[v.weekday()]}."
            )
        return v


class WorkoutsGenerate(BaseModel):

    days: list[Weekday] = Field(min_length=1, max_length=7)
    names: list[str] | None = None


class ExerciseCreate(BaseModel):

    definition_id: int
    position: int | None = None
    superset_group: str | None = None
    notes: str | None = None


class SetLogCreate(BaseModel):

    set_number: int = Field(ge=1)
    reps: int = Field(ge=0)
    weight: float | None = Field(default=None, ge=0)
    rpe: float | None = Field(default=None, ge=1, le=10)
    prescription_id: int | None = None


class StatusUpdate(BaseModel):
    status: BlockStatus


class ProfileUpdate(BaseModel):

    name: str | None = Field(default=None, min_length=1, max_length=80)
    weight_unit: WeightUnit | None = None


class SetPrescriptionOut(BaseModel):

    model_config = ConfigDict(from_attributes=True)

    id: int
    exercise_id: int
    set_number: int
    target_reps: int
    target_weight: float | None
    target_rpe: float | None


class PrescriptionIn(BaseModel):

    set_number: int = Field(ge=1)
    target_reps: int = Field(ge=1)
    target_weight: float | None = Field(default=None, gt=0)
    target_rpe: float | None = Field(default=None, ge=1, le=10)


class PrescriptionsReplace(BaseModel):

    sets: list[PrescriptionIn] = Field(max_length=20)


class AthleteProfileOut(BaseModel):

    model_config = ConfigDict(from_attributes=True)

    athlete_id: uuid.UUID
    birth_date: datetime.date | None
    age: int | None
    phone: str | None
    city: str | None
    gender: Gender | None
    height_cm: float | None
    occupation: str | None
    training_since: str | None
    sports: str | None
    injuries: str | None
    nutrition: str | None
    goals: str | None
    priorities: str | None
    best_squat: float | None
    best_bench: float | None
    best_deadlift: float | None
    total: float | None
    coach_note: str | None = None


class AthleteProfileIn(BaseModel):

    birth_date: datetime.date | None = None
    phone: str | None = Field(default=None, max_length=40)
    city: str | None = Field(default=None, max_length=120)
    gender: Gender | None = None
    height_cm: float | None = Field(default=None, ge=100, le=250)
    occupation: str | None = None
    training_since: str | None = None
    sports: str | None = None
    injuries: str | None = None
    nutrition: str | None = None
    goals: str | None = None
    priorities: str | None = None
    best_squat: float | None = Field(default=None, gt=0)
    best_bench: float | None = Field(default=None, gt=0)
    best_deadlift: float | None = Field(default=None, gt=0)
    coach_note: str | None = None


class VideoRequired(BaseModel):
    required: bool


class DefinitionIn(BaseModel):

    name: str = Field(min_length=1, max_length=120)
    explanation: str = Field(default="", max_length=2000)
    muscle_group: str | None = Field(default=None, max_length=60)
    video_url: str | None = Field(default=None, max_length=500)
    image_url: str | None = Field(default=None, max_length=500)


class WorkoutIn(BaseModel):

    name: str = Field(min_length=1, max_length=120)
    week_number: int = Field(ge=1)
    day_of_week: Weekday


class WorkoutUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    status: WorkoutStatus | None = None
    athlete_notes: str | None = None


class ExerciseUpdate(BaseModel):
    notes: str | None = None
    superset_group: str | None = Field(default=None, max_length=10)


class ReorderIn(BaseModel):

    exercise_ids: list[int] = Field(min_length=1, max_length=50)


class BlockUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    total_weeks: int | None = Field(default=None, ge=1, le=52)
    notes: str | None = None


class InvitationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    token: str
    email: str | None
    name: str | None
    created_at: datetime.datetime | None
    expires_at: datetime.datetime | None
    accepted_at: datetime.datetime | None
    accepted: bool
    expired: bool
    usable: bool


class InvitationIn(BaseModel):
    email: str | None = Field(default=None, max_length=200)
    name: str | None = Field(default=None, max_length=80)
    days: int = Field(default=30, ge=1, le=365)


class InvitationPublic(BaseModel):
    # Lo minimo para que quien abre el enlace sepa donde entra.
    coach_name: str
    name: str | None
    email: str | None
    usable: bool
    expired: bool
    accepted: bool


class BlockStats(BaseModel):
    workouts: int
    exercises: int
    logs: int
