import uuid
from typing import Optional
import psycopg
from models import AthleteStatus, Role, User, WeightUnit

_COLUMNS = (
    "id, name, email, role, coach_id, status, weight_unit, "
    "terms_version, terms_accepted_at, health_consent_at"
)


def _row_to_user(row: dict) -> User:
    return User(
        id=row["id"],
        name=row["name"],
        email=row["email"],
        role=Role(row["role"]),
        coach_id=row["coach_id"],
        status=AthleteStatus(row["status"]),
        weight_unit=WeightUnit(row["weight_unit"]),
        terms_version=row["terms_version"],
        terms_accepted_at=row["terms_accepted_at"],
        health_consent_at=row["health_consent_at"],
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
    conn.execute(
        "update profiles set "
        "  name = coalesce(%s, name), "
        "  weight_unit = coalesce(%s::text, weight_unit) "
        "where id = %s",
        (name, weight_unit.value if weight_unit else None, user_id),
    )


def record_consent(
    conn: psycopg.Connection,
    user_id: uuid.UUID,
    terms_version: str,
    health: bool,
) -> None:
    # Para quien ya tenia cuenta antes de que existieran los textos.
    conn.execute(
        "update profiles set "
        "  terms_version = %s, "
        "  terms_accepted_at = now(), "
        "  health_consent_at = case when %s then now() else health_consent_at end "
        "where id = %s",
        (terms_version, health, user_id),
    )


def delete_account(conn: psycopg.Connection, user_id: uuid.UUID) -> None:
    # Se borra de auth.users y el resto cae en cascada: perfil, bloques,
    # sesiones, series y avisos. No queda nada.
    conn.execute("delete from auth.users where id = %s", (user_id,))
