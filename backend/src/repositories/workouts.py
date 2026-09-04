from typing import Optional
import psycopg
from models import Weekday, Workout, WorkoutStatus

_COLUMNS = (
    "id, block_id, name, week_number, day_of_week, "
    "status, completed_at, athlete_notes"
)

_INSERT_COLUMNS = (
    "block_id, name, week_number, day_of_week, status, athlete_notes"
)

_INSERT_SQL = (
    f"insert into workouts ({_INSERT_COLUMNS}) "
    "values (%s, %s, %s, %s, %s, %s)"
)


def _insert_params(w: Workout) -> tuple:
    return (
        w.block_id,
        w.name,
        w.week_number,
        int(w.day_of_week),
        w.status.value,
        w.athlete_notes,
    )


def _row_to_workout(row: dict) -> Workout:
    return Workout(
        id=row["id"],
        block_id=row["block_id"],
        name=row["name"],
        week_number=row["week_number"],
        day_of_week=Weekday(row["day_of_week"]),
        status=WorkoutStatus(row["status"]),
        completed_at=row["completed_at"],
        athlete_notes=row["athlete_notes"],
    )


def create_many(
    conn: psycopg.Connection, workouts: list[Workout]
) -> None:
    if not workouts:
        return
    with conn.cursor() as cur:
        cur.executemany(_INSERT_SQL, [_insert_params(w) for w in workouts])


def create(conn: psycopg.Connection, workout: Workout) -> int:
    row = conn.execute(
        _INSERT_SQL + " returning id",
        _insert_params(workout),
    ).fetchone()
    return row["id"]


def get_by_id(
    conn: psycopg.Connection, workout_id: int
) -> Optional[Workout]:
    row = conn.execute(
        f"select {_COLUMNS} from workouts where id = %s",
        (workout_id, ),
    ).fetchone()
    return _row_to_workout(row) if row else None


def get_by_slot(
    conn: psycopg.Connection,
    block_id: int,
    week_number: int,
    day_of_week: Weekday,
) -> Optional[Workout]:
    row = conn.execute(
        f"select {_COLUMNS} from workouts "
        "where block_id = %s and week_number = %s and day_of_week = %s",
        (block_id, week_number, int(day_of_week)),
    ).fetchone()
    return _row_to_workout(row) if row else None


def list_for_block(
    conn: psycopg.Connection, block_id: int
) -> list[Workout]:
    filas = conn.execute(
        f"select {_COLUMNS} from workouts where block_id = %s "
        "order by week_number, day_of_week",
        (block_id,),
    ).fetchall()
    return [_row_to_workout(row) for row in filas]


def list_for_week(
    conn: psycopg.Connection, block_id: int, week_number: int
) -> list[Workout]:
    filas = conn.execute(
        f"select {_COLUMNS} from workouts where block_id = %s and week_number = %s "
        "order by day_of_week",
        (block_id, week_number),
    ).fetchall()
    return [_row_to_workout(row) for row in filas]


def mark_completed(
    conn: psycopg.Connection,
    workout_id: int,
    athlete_notes: Optional[str] = None,
) -> None:
    conn.execute(
        "update workouts "
        "set status = %s, completed_at = now(), athlete_notes = %s "
        "where id = %s",
        (WorkoutStatus.COMPLETED.value, athlete_notes, workout_id),
    )


def update(
    conn: psycopg.Connection,
    workout_id: int,
    name: Optional[str] = None,
    status: Optional[WorkoutStatus] = None,
    athlete_notes: Optional[str] = None,
) -> None:
    conn.execute(
        "update workouts set "
        "  name = coalesce(%s, name), "
        "  status = coalesce(%s::text, status), "
        "  athlete_notes = coalesce(%s::text, athlete_notes) "
        "where id = %s",
        (
            name,
            status.value if status else None,
            athlete_notes,
            workout_id,
        ),
    )


def delete(conn: psycopg.Connection, workout_id: int) -> None:
    conn.execute("delete from workouts where id = %s", (workout_id,))


def max_week(conn: psycopg.Connection, block_id: int) -> int:
    # 0 si el bloque no tiene ninguna sesion todavia.
    row = conn.execute(
        "select coalesce(max(week_number), 0) as ultima "
        "from workouts where block_id = %s",
        (block_id,),
    ).fetchone()
    return row["ultima"]


def count_from_week(
    conn: psycopg.Connection, block_id: int, desde: int
) -> int:
    row = conn.execute(
        "select count(*) as n from workouts "
        "where block_id = %s and week_number >= %s",
        (block_id, desde),
    ).fetchone()
    return row["n"]
