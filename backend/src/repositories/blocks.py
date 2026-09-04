import uuid
from typing import Optional
import psycopg
from models import Block, BlockStatus

_COLUMNS = (
    "id, name, coach_id, athlete_id, total_weeks, "
    "start_date, status, notes"
)

_INSERT_COLUMNS = (
    "name, coach_id, athlete_id, total_weeks, "
    "start_date, status, notes"
)


def _row_to_block(row: dict) -> Block:
    return Block(
        id=row["id"],
        name=row["name"],
        coach_id=row["coach_id"],
        athlete_id=row["athlete_id"],
        total_weeks=row["total_weeks"],
        start_date=row["start_date"],
        status=BlockStatus(row["status"]),
        notes=row["notes"],
    )


def create(conn: psycopg.Connection, block: Block) -> int:
    row = conn.execute(
        f"insert into blocks ({_INSERT_COLUMNS}) "
        "values (%s, %s, %s, %s, %s, %s, %s) "
        "returning id",
        (
            block.name,
            block.coach_id,
            block.athlete_id,
            block.total_weeks,
            block.start_date,
            block.status.value,
            block.notes,
        ),
    ).fetchone()
    return row["id"]


def get_by_id(
    conn: psycopg.Connection, block_id: int
) -> Optional[Block]:
    row = conn.execute(
            f"select {_COLUMNS} from blocks where id = %s",
            (block_id, ),
        ).fetchone()
    return _row_to_block(row) if row else None


def list_for_coach(
    conn: psycopg.Connection, coach_id: uuid.UUID
) -> list[Block]:
    table = conn.execute(
        f"select {_COLUMNS} from blocks where coach_id = %s "
        "order by start_date desc",
        (coach_id, )
    ).fetchall()
    return [_row_to_block(row) for row in table]


def list_for_athlete(
    conn: psycopg.Connection, athlete_id: uuid.UUID
) -> list[Block]:
    table = conn.execute(
        f"select {_COLUMNS} from blocks where athlete_id = %s order by name",
        (athlete_id, )
    ).fetchall()
    return [_row_to_block(row) for row in table]


def get_active_for_athlete(
    conn: psycopg.Connection, athlete_id: uuid.UUID
) -> Optional[Block]:
    row = conn.execute(
        f"select {_COLUMNS} from blocks where athlete_id = %s"
        " and status = 'active'",
        (athlete_id, )
    ).fetchone()
    return _row_to_block(row) if row else None


def update_status(
    conn: psycopg.Connection, block_id: int, status: BlockStatus
) -> None:
    conn.execute(
        "update blocks set status = %s where id = %s",
        (status.value, block_id),
    )
