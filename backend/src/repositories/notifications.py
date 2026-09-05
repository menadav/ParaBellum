import datetime
import uuid
from typing import Optional

import psycopg

from models import Notification, NotificationKind

_COLUMNS = (
    "id, coach_id, athlete_id, batch, kind, title, body, "
    "created_at, read_at, expires_at"
)


def _row_to_notification(row: dict) -> Notification:
    return Notification(
        id=row["id"],
        coach_id=row["coach_id"],
        athlete_id=row["athlete_id"],
        batch=row["batch"],
        kind=NotificationKind(row["kind"]),
        title=row["title"],
        body=row["body"],
        created_at=row["created_at"],
        read_at=row["read_at"],
        expires_at=row["expires_at"],
    )


def send(
    conn: psycopg.Connection,
    coach_id: uuid.UUID,
    athlete_ids: list[uuid.UUID],
    kind: NotificationKind,
    title: str,
    body: Optional[str] = None,
    expires_at: Optional[datetime.datetime] = None,
) -> uuid.UUID:
    # Una fila por atleta, todas con el mismo batch para poder agruparlas.
    batch = uuid.uuid4()
    with conn.cursor() as cur:
        cur.executemany(
            "insert into notifications "
            "(coach_id, athlete_id, batch, kind, title, body, expires_at) "
            "values (%s, %s, %s, %s, %s, %s, %s)",
            [
                (coach_id, athlete_id, batch, kind.value, title, body, expires_at)
                for athlete_id in athlete_ids
            ],
        )
    return batch


def pending_for(
    conn: psycopg.Connection, athlete_id: uuid.UUID
) -> list[Notification]:
    # Lo que ve el atleta al entrar: sin leer y sin caducar.
    filas = conn.execute(
        f"select {_COLUMNS} from notifications "
        "where athlete_id = %s and read_at is null "
        "  and (expires_at is null or expires_at > now()) "
        "order by created_at desc",
        (athlete_id,),
    ).fetchall()
    return [_row_to_notification(row) for row in filas]


def list_for_athlete(
    conn: psycopg.Connection, athlete_id: uuid.UUID, limit: int = 50
) -> list[Notification]:
    filas = conn.execute(
        f"select {_COLUMNS} from notifications where athlete_id = %s "
        "order by created_at desc limit %s",
        (athlete_id, limit),
    ).fetchall()
    return [_row_to_notification(row) for row in filas]


def get_by_id(
    conn: psycopg.Connection, notification_id: int
) -> Optional[Notification]:
    row = conn.execute(
        f"select {_COLUMNS} from notifications where id = %s",
        (notification_id,),
    ).fetchone()
    return _row_to_notification(row) if row else None


def mark_read(
    conn: psycopg.Connection, notification_id: int, athlete_id: uuid.UUID
) -> bool:
    # El athlete_id va en el where: nadie marca lo que no es suyo.
    row = conn.execute(
        "update notifications set read_at = now() "
        "where id = %s and athlete_id = %s and read_at is null "
        "returning id",
        (notification_id, athlete_id),
    ).fetchone()
    return row is not None


def mark_all_read(conn: psycopg.Connection, athlete_id: uuid.UUID) -> int:
    filas = conn.execute(
        "update notifications set read_at = now() "
        "where athlete_id = %s and read_at is null returning id",
        (athlete_id,),
    ).fetchall()
    return len(filas)


def sent_by(conn: psycopg.Connection, coach_id: uuid.UUID, limit: int = 50):
    # Un envio por fila, con cuantos lo han leido ya.
    return conn.execute(
        "select batch, kind, title, body, expires_at, "
        "       min(created_at) as created_at, "
        "       count(*) as total, "
        "       count(read_at) as leidos, "
        "       array_agg(athlete_id) as athlete_ids "
        "from notifications where coach_id = %s "
        "group by batch, kind, title, body, expires_at "
        "order by min(created_at) desc limit %s",
        (coach_id, limit),
    ).fetchall()


def delete_batch(
    conn: psycopg.Connection, batch: uuid.UUID, coach_id: uuid.UUID
) -> int:
    filas = conn.execute(
        "delete from notifications where batch = %s and coach_id = %s "
        "returning id",
        (batch, coach_id),
    ).fetchall()
    return len(filas)
