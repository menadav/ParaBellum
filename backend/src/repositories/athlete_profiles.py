"""Repositorio de la ficha del atleta."""

import uuid
from decimal import Decimal
from typing import Optional

import psycopg

from models import AthleteProfile, Gender

_CAMPOS = (
    "birth_date", "phone", "city", "gender", "height_cm", "occupation",
    "training_since", "sports", "injuries", "nutrition", "goals",
    "priorities", "best_squat", "best_bench", "best_deadlift",
    "coach_note",
)

_COLUMNS = "athlete_id, " + ", ".join(_CAMPOS)


def _a_float(v: Optional[Decimal]) -> Optional[float]:
    return float(v) if v is not None else None


def _row_to_profile(row: dict) -> AthleteProfile:
    return AthleteProfile(
        athlete_id=row["athlete_id"],
        birth_date=row["birth_date"],
        phone=row["phone"],
        city=row["city"],
        gender=Gender(row["gender"]) if row["gender"] else None,
        height_cm=_a_float(row["height_cm"]),
        occupation=row["occupation"],
        training_since=row["training_since"],
        sports=row["sports"],
        injuries=row["injuries"],
        nutrition=row["nutrition"],
        goals=row["goals"],
        priorities=row["priorities"],
        best_squat=_a_float(row["best_squat"]),
        best_bench=_a_float(row["best_bench"]),
        best_deadlift=_a_float(row["best_deadlift"]),
        coach_note=row["coach_note"],
    )


def get(
    conn: psycopg.Connection, athlete_id: uuid.UUID
) -> Optional[AthleteProfile]:
    """La ficha de un atleta. None si nunca se ha rellenado."""
    row = conn.execute(
        f"select {_COLUMNS} from athlete_profiles where athlete_id = %s",
        (athlete_id,),
    ).fetchone()
    return _row_to_profile(row) if row else None


def upsert(conn: psycopg.Connection, perfil: AthleteProfile) -> None:
    """Crea la ficha o la actualiza entera.

    Como la ficha es un formulario que se envia completo, no hace falta
    la actualizacion parcial: llega todo o no llega nada.
    """
    valores = {
        "birth_date": perfil.birth_date,
        "phone": perfil.phone,
        "city": perfil.city,
        "gender": perfil.gender.value if perfil.gender else None,
        "height_cm": perfil.height_cm,
        "occupation": perfil.occupation,
        "training_since": perfil.training_since,
        "sports": perfil.sports,
        "injuries": perfil.injuries,
        "nutrition": perfil.nutrition,
        "goals": perfil.goals,
        "priorities": perfil.priorities,
        "best_squat": perfil.best_squat,
        "best_bench": perfil.best_bench,
        "best_deadlift": perfil.best_deadlift,
        "coach_note": perfil.coach_note,
    }
    huecos = ", ".join(["%s"] * (len(_CAMPOS) + 1))
    actualiza = ", ".join(f"{c} = excluded.{c}" for c in _CAMPOS)

    conn.execute(
        f"insert into athlete_profiles ({_COLUMNS}) values ({huecos}) "
        "on conflict (athlete_id) do update set "
        f"{actualiza}, updated_at = now()",
        (perfil.athlete_id, *(valores[c] for c in _CAMPOS)),
    )
