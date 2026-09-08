import uuid
from decimal import Decimal
from typing import Optional
import psycopg
from models import SetLog

_COLUMNS = (
    "id, exercise_id, set_number, reps, weight, rpe, "
    "prescription_id, completed_at, logged_by, video_required"
)

_COLUMNS_SL = ", ".join(f"sl.{c}" for c in _COLUMNS.split(", "))


def _a_float(valor: Optional[Decimal]) -> Optional[float]:
    return float(valor) if valor is not None else None


def _row_to_set_log(row: dict) -> SetLog:
    return SetLog(
        id=row["id"],
        exercise_id=row["exercise_id"],
        set_number=row["set_number"],
        reps=row["reps"],
        weight=_a_float(row["weight"]),
        rpe=_a_float(row["rpe"]),
        prescription_id=row["prescription_id"],
        completed_at=row["completed_at"],
        logged_by=row["logged_by"],
        video_required=row["video_required"],
    )


def upsert(conn: psycopg.Connection, log: SetLog) -> int:
    row = conn.execute(
        "insert into set_logs "
        "(exercise_id, set_number, reps, weight, rpe, prescription_id, "
        " logged_by) "
        "values (%s, %s, %s, %s, %s, %s, %s) "
        "on conflict (exercise_id, set_number) do update set "
        "    reps = excluded.reps, "
        "    weight = excluded.weight, "
        "    rpe = excluded.rpe, "
        "    prescription_id = excluded.prescription_id, "
        "    logged_by = excluded.logged_by, "
        "    completed_at = now() "
        "returning id",
        (
            log.exercise_id,
            log.set_number,
            log.reps,
            log.weight,
            log.rpe,
            log.prescription_id,
            log.logged_by,
        ),
    ).fetchone()
    return row["id"]


def history(
    conn: psycopg.Connection,
    athlete_id: uuid.UUID,
    definition_id: int,
    limit: int = 50,
) -> list[SetLog]:
    filas = conn.execute(
        f"select {_COLUMNS_SL} "
        "from set_logs sl "
        "join exercises e on e.id = sl.exercise_id "
        "join workouts  w on w.id = e.workout_id "
        "join blocks    b on b.id = w.block_id "
        "where b.athlete_id = %s and e.definition_id = %s "
        "order by sl.completed_at desc "
        "limit %s",
        (athlete_id, definition_id, limit),
    ).fetchall()
    return [_row_to_set_log(row) for row in filas]


def list_for_exercise(
    conn: psycopg.Connection, exercise_id: int
) -> list[SetLog]:
    filas = conn.execute(
        f"select {_COLUMNS} from set_logs where exercise_id = %s "
        "order by set_number",
        (exercise_id,),
    ).fetchall()
    return [_row_to_set_log(row) for row in filas]


def list_for_workout(
    conn: psycopg.Connection, workout_id: int
) -> list[SetLog]:
    filas = conn.execute(
        f"select {_COLUMNS_SL} "
        "from set_logs sl "
        "join exercises e on e.id = sl.exercise_id "
        "where e.workout_id = %s "
        "order by e.position, sl.set_number",
        (workout_id,),
    ).fetchall()
    return [_row_to_set_log(row) for row in filas]


def delete(conn: psycopg.Connection, set_log_id: int) -> None:
    conn.execute(
        "delete from set_logs where id = %s",
        (set_log_id,),
    )


def set_video_required(
    conn: psycopg.Connection,
    exercise_id: int,
    set_number: int,
    requerido: bool,
) -> None:
    conn.execute(
        "update set_logs set video_required = %s "
        "where exercise_id = %s and set_number = %s",
        (requerido, exercise_id, set_number),
    )


def list_for_block(
    conn: psycopg.Connection, block_id: int
) -> list[SetLog]:
    filas = conn.execute(
        f"select {_COLUMNS_SL} from set_logs sl "
        "join exercises e on e.id = sl.exercise_id "
        "join workouts  w on w.id = e.workout_id "
        "where w.block_id = %s "
        "order by w.week_number, w.day_of_week, e.position, sl.set_number",
        (block_id,),
    ).fetchall()
    return [_row_to_set_log(row) for row in filas]


def import_many(
    conn: psycopg.Connection,
    exercise_id: int,
    filas: list[tuple],
) -> None:
    # (set_number, reps, weight, rpe, completed_at) de datos historicos:
    # la fecha viene del Excel, no de now().
    with conn.cursor() as cur:
        cur.executemany(
            "insert into set_logs "
            "(exercise_id, set_number, reps, weight, rpe, completed_at) "
            "values (%s, %s, %s, %s, %s, %s) "
            "on conflict (exercise_id, set_number) do nothing",
            [(exercise_id, *fila) for fila in filas],
        )


def sync_with_targets(
    conn: psycopg.Connection,
    exercise_id: int,
    coach_id: uuid.UUID,
    objetivos: list[tuple],
) -> tuple[int, int]:
    # (set_number, reps, weight, rpe) por objetivo.
    #
    # Crea la serie que falta, y si ya existe la actualiza SOLO cuando
    # sigue siendo del coach. El "where" es la clave: si el atleta ya
    # movio 107.5 donde le pedian 100, cambiar el objetivo no puede
    # pisarle la marca. Pero una serie pendiente es del coach, asi que
    # tiene que seguir al objetivo o quedaria incoherente.
    creadas = 0
    if objetivos:
        with conn.cursor() as cur:
            cur.executemany(
                "insert into set_logs "
                "(exercise_id, set_number, reps, weight, rpe, logged_by) "
                "values (%s, %s, %s, %s, %s, %s) "
                "on conflict (exercise_id, set_number) do update set "
                "    reps = excluded.reps, "
                "    weight = excluded.weight, "
                "    rpe = excluded.rpe "
                "where set_logs.logged_by = excluded.logged_by",
                [(exercise_id, *o, coach_id) for o in objetivos],
            )
            creadas = cur.rowcount if cur.rowcount > 0 else 0

    # Si el coach recorta de 5 series a 3, las dos que sobran se van,
    # pero solo si siguen pendientes. Lo que hizo el atleta se queda.
    numeros = [o[0] for o in objetivos]
    borradas = conn.execute(
        "delete from set_logs "
        "where exercise_id = %s and logged_by = %s "
        "  and not (set_number = any(%s)) "
        "returning id",
        (exercise_id, coach_id, numeros),
    ).fetchall()
    return creadas, len(borradas)
