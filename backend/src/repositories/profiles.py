import uuid
from typing import Optional
import psycopg
from models import AthleteStatus, Role, User, WeightUnit

_COLUMNS = "id, name, email, role, coach_id, status, weight_unit"


def _row_to_user(row: dict) -> User:
    return User(
        id=row["id"],
        name=row["name"],
        email=row["email"],
        role=Role(row["role"]),
        coach_id=row["coach_id"],
        status=AthleteStatus(row["status"]),
        weight_unit=WeightUnit(row["weight_unit"]),
    )


def get_by_id(
    conn: psycopg.Connection, user_id: uuid.UUID
) -> Optional[User]:

    row = conn.execute(
        f"select {_COLUMNS} from profiles where id = %s",
        (user_id,),
    ).fetchone()
    return _row_to_user(row) if row else None


def get_by_email(
    conn: psycopg.Connection, email: str
) -> Optional[User]:
    row = conn.execute(
        f"select {_COLUMNS} from profiles where email = %s",
        (email,),
    ).fetchone()
    return _row_to_user(row) if row else None


def list_athletes(
    conn: psycopg.Connection, coach_id: uuid.UUID
) -> list[User]:
    filas = conn.execute(
        f"select {_COLUMNS} from profiles where coach_id = %s order by name",
        (coach_id, ),
    ).fetchall()
    return [_row_to_user(row) for row in filas]


def update_status(
    conn: psycopg.Connection,
    user_id: uuid.UUID,
    status: AthleteStatus,
) -> None:
    conn.execute(
        "update profiles set status = %s where id = %s",
        (status, user_id),
    )


def update_profile(
    conn: psycopg.Connection,
    user_id: uuid.UUID,
    name: Optional[str] = None,
    weight_unit: Optional[WeightUnit] = None,
) -> None:
    """Actualiza solo los campos que llegan; coalesce deja el resto igual."""
    conn.execute(
        "update profiles set "
        "  name = coalesce(%s, name), "
        "  weight_unit = coalesce(%s::text, weight_unit) "
        "where id = %s",
        (name, weight_unit.value if weight_unit else None, user_id),
    )
