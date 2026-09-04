from typing import Optional
import psycopg
from models import Exercise

_COLUMNS = (
    "id, workout_id, definition_id, position, superset_group, notes"
)

_INSERT_COLUMNS = (
    "workout_id, definition_id, position, superset_group, notes"
)

_OFFSET = 1000


def _row_to_exercise(row: dict) -> Exercise:
    return Exercise(
        id=row["id"],
        workout_id=row["workout_id"],
        definition_id=row["definition_id"],
        position=row["position"],
        superset_group=row["superset_group"],
        notes=row["notes"],
    )


def reorder(
    conn: psycopg.Connection, workout_id: int, ordered_ids: list[int]
) -> None:
    if not ordered_ids:
        return
    conn.execute(
        "update exercises set position = position + %s "
        "where workout_id = %s",
        (_OFFSET, workout_id),
    )
    with conn.cursor() as cur:
        cur.executemany(
            "update exercises set position = %s "
            "where id = %s and workout_id = %s",
            [
                (posicion, ejercicio_id, workout_id)
                for posicion, ejercicio_id in enumerate(ordered_ids, 1)
            ],
        )


def next_position(conn: psycopg.Connection, workout_id: int) -> int:
    row = conn.execute(
        "select coalesce(max(position), 0) + 1 as siguiente "
        "from exercises where workout_id = %s",
        (workout_id,),
    ).fetchone()
    return row["siguiente"]


def add(conn: psycopg.Connection, exercise: Exercise) -> int:
    row = conn.execute(
        f"insert into exercises ({_INSERT_COLUMNS}) "
        "values (%s, %s, %s, %s, %s) "
        "returning id",
        (
            exercise.workout_id,
            exercise.definition_id,
            exercise.position,
            exercise.superset_group,
            exercise.notes,
        ),
    ).fetchone()
    return row["id"]


def list_for_workout(
    conn: psycopg.Connection, workout_id: int
) -> list[Exercise]:
    filas = conn.execute(
        f"select {_COLUMNS} from exercises where workout_id = %s "
        "order by position",
        (workout_id,),
    ).fetchall()
    return [_row_to_exercise(row) for row in filas]


def remove(conn: psycopg.Connection, exercise_id: int) -> None:
    conn.execute(
        "delete from exercises where id = %s",
        (exercise_id,),
    )


def update(
    conn: psycopg.Connection,
    exercise_id: int,
    notes: Optional[str] = None,
    superset_group: Optional[str] = None,
) -> None:
    conn.execute(
        "update exercises set "
        "  notes = coalesce(%s::text, notes), "
        "  superset_group = coalesce(%s::text, superset_group) "
        "where id = %s",
        (notes, superset_group, exercise_id),
    )
