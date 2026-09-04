import secrets
import uuid
from typing import Optional

import psycopg

from models import Invitation

_COLUMNS = (
    "id, token, coach_id, email, name, created_at, expires_at, "
    "accepted_at, accepted_by"
)


def _row_to_invitation(row: dict) -> Invitation:
    return Invitation(
        id=row["id"],
        token=row["token"],
        coach_id=row["coach_id"],
        email=row["email"],
        name=row["name"],
        created_at=row["created_at"],
        expires_at=row["expires_at"],
        accepted_at=row["accepted_at"],
        accepted_by=row["accepted_by"],
    )


def nuevo_token() -> str:
    # 32 bytes al azar: adivinarlo es inviable, y es lo unico que
    # protege la invitacion, asi que no puede ser corto ni predecible.
    return secrets.token_urlsafe(32)


def create(
    conn: psycopg.Connection,
    coach_id: uuid.UUID,
    email: Optional[str] = None,
    name: Optional[str] = None,
    dias: int = 30,
) -> Invitation:
    row = conn.execute(
        f"insert into invitations (token, coach_id, email, name, expires_at) "
        f"values (%s, %s, %s, %s, now() + make_interval(days => %s)) "
        f"returning {_COLUMNS}",
        (nuevo_token(), coach_id, email, name, dias),
    ).fetchone()
    return _row_to_invitation(row)


def get_by_token(
    conn: psycopg.Connection, token: str
) -> Optional[Invitation]:
    row = conn.execute(
        f"select {_COLUMNS} from invitations where token = %s",
        (token,),
    ).fetchone()
    return _row_to_invitation(row) if row else None


def list_for_coach(
    conn: psycopg.Connection, coach_id: uuid.UUID
) -> list[Invitation]:
    filas = conn.execute(
        f"select {_COLUMNS} from invitations where coach_id = %s "
        "order by created_at desc",
        (coach_id,),
    ).fetchall()
    return [_row_to_invitation(row) for row in filas]


def delete(conn: psycopg.Connection, invitation_id: int) -> None:
    conn.execute("delete from invitations where id = %s", (invitation_id,))
