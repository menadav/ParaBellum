
import datetime

import pytest

import db
from models import Block, BlockStatus


@pytest.fixture
def conn():
    c = db.connect()
    try:
        yield c
    finally:
        c.rollback()
        c.close()


@pytest.fixture
def coach(conn):
    row = conn.execute(
        "select id from profiles where role = 'coach' limit 1"
    ).fetchone()
    if row is None:
        pytest.skip("no hay ningun coach en la base de datos")
    return row["id"]


@pytest.fixture
def athlete(conn):
    row = conn.execute(
        "select id from profiles where role = 'athlete' limit 1"
    ).fetchone()
    if row is None:
        pytest.skip("no hay ningun atleta en la base de datos")
    return row["id"]


@pytest.fixture
def proximo_lunes():
    hoy = datetime.date.today()
    return hoy + datetime.timedelta(days=(7 - hoy.weekday()) % 7)


@pytest.fixture
def bloque_nuevo(coach, athlete, proximo_lunes):
    return Block(
        id=0,
        name="Bloque de test",
        coach_id=coach,
        athlete_id=athlete,
        total_weeks=8,
        start_date=proximo_lunes,
        status=BlockStatus.DRAFT,
        notes=None,
    )
