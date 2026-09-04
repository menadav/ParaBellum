from decimal import Decimal
from typing import Optional
import psycopg
from models import SetPrescription

_COLUMNS = (
    "id, exercise_id, set_number, target_reps, target_weight, target_rpe"
)

_COLUMNS_SP = ", ".join(f"sp.{c}" for c in _COLUMNS.split(", "))


def _a_float(valor: Optional[Decimal]) -> Optional[float]:
    return float(valor) if valor is not None else None


def _row_to_prescription(row: dict) -> SetPrescription:
    return SetPrescription(
        id=row["id"],
        exercise_id=row["exercise_id"],
        set_number=row["set_number"],
        target_reps=row["target_reps"],
        target_weight=_a_float(row["target_weight"]),
        target_rpe=_a_float(row["target_rpe"]),
    )


def replace_for_exercise(
    conn: psycopg.Connection,
    exercise_id: int,
    prescripciones: list[SetPrescription],
) -> None:
    conn.execute(
        "delete from set_prescriptions where exercise_id = %s",
        (exercise_id,),
    )
    if not prescripciones:
        return
    with conn.cursor() as cur:
        cur.executemany(
            "insert into set_prescriptions "
            "(exercise_id, set_number, target_reps, target_weight, "
            " target_rpe) values (%s, %s, %s, %s, %s)",
            [
                (
                    exercise_id,
                    p.set_number,
                    p.target_reps,
                    p.target_weight,
                    p.target_rpe,
                )
                for p in prescripciones
            ],
        )


def list_for_exercise(
    conn: psycopg.Connection, exercise_id: int
) -> list[SetPrescription]:
    filas = conn.execute(
        f"select {_COLUMNS} from set_prescriptions "
        "where exercise_id = %s order by set_number",
        (exercise_id,),
    ).fetchall()
    return [_row_to_prescription(row) for row in filas]


def list_for_workout(
    conn: psycopg.Connection, workout_id: int
) -> list[SetPrescription]:
    filas = conn.execute(
        f"select {_COLUMNS_SP} from set_prescriptions sp "
        "join exercises e on e.id = sp.exercise_id "
        "where e.workout_id = %s "
        "order by e.position, sp.set_number",
        (workout_id,),
    ).fetchall()
    return [_row_to_prescription(row) for row in filas]
