import uuid
from typing import Optional
import psycopg
from models import ExerciseDefinition

_COLUMNS = (
    "id, name, explanation, coach_id, muscle_group, "
    "video_url, image_url"
)

_INSERT_COLUMNS = (
    "name, explanation, coach_id, muscle_group, video_url, image_url"
)


def _row_to_definition(row: dict) -> ExerciseDefinition:
    return ExerciseDefinition(
        id=row["id"],
        name=row["name"],
        explanation=row["explanation"],
        coach_id=row["coach_id"],
        muscle_group=row["muscle_group"],
        video_url=row["video_url"],
        image_url=row["image_url"],
    )


def search(
    conn: psycopg.Connection,
    coach_id: uuid.UUID,
    query: str = "",
    muscle_group: Optional[str] = None,
) -> list[ExerciseDefinition]:
    filas = conn.execute(
        f"select {_COLUMNS} from exercise_definitions "
        "where (coach_id is null or coach_id = %s) "
        "  and name ilike %s "
        "  and (%s::text is null or muscle_group = %s) "
        "order by name",
        (coach_id, f"%{query}%", muscle_group, muscle_group),
    ).fetchall()
    return [_row_to_definition(row) for row in filas]


def create(
    conn: psycopg.Connection, definition: ExerciseDefinition
) -> int:
    row = conn.execute(
        f"insert into exercise_definitions ({_INSERT_COLUMNS}) "
        "values (%s, %s, %s, %s, %s, %s) "
        "returning id",
        (
            definition.name,
            definition.explanation,
            definition.coach_id,
            definition.muscle_group,
            definition.video_url,
            definition.image_url,
        ),
    ).fetchone()
    return row["id"]


def get_by_id(
    conn: psycopg.Connection, definition_id: int
) -> Optional[ExerciseDefinition]:
    row = conn.execute(
        f"select {_COLUMNS} from exercise_definitions where id = %s",
        (definition_id, ),
    ).fetchone()
    return _row_to_definition(row) if row else None


def delete(conn: psycopg.Connection, definition_id: int) -> None:
    conn.execute(
        "delete from exercise_definitions where id = %s",
        (definition_id,),
    )


def update(
    conn: psycopg.Connection, definition: ExerciseDefinition
) -> None:
    conn.execute(
        "update exercise_definitions set "
        "  name = %s, explanation = %s, muscle_group = %s, "
        "  video_url = %s, image_url = %s "
        "where id = %s",
        (
            definition.name,
            definition.explanation,
            definition.muscle_group,
            definition.video_url,
            definition.image_url,
            definition.id,
        ),
    )
