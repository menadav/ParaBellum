"""Piezas compartidas por todos los tests.

conftest.py es un nombre magico: pytest lo carga solo, sin importarlo
nadie. Lo que definas aqui con @pytest.fixture esta disponible en
cualquier test, con solo pedirlo por su nombre como parametro.
"""

import datetime

import pytest

import db
from models import Block, BlockStatus


@pytest.fixture
def conn():
    """Una conexion que SIEMPRE deshace lo que el test haya hecho.

    Esta es la idea clave de los tests contra base de datos: nunca se
    hace commit. El test inserta, comprueba, y al terminar el rollback
    borra todo rastro. Tu base de datos de Supabase queda intacta,
    ejecutes los tests mil veces.

    Fijate en que NO usamos db.transaction(): esa hace commit al salir,
    que es justo lo que aqui no queremos.
    """
    c = db.connect()
    try:
        yield c
    finally:
        c.rollback()
        c.close()


@pytest.fixture
def coach(conn):
    """Un coach que ya existe en la base de datos.

    No podemos crear perfiles desde el test: dependen de auth.users, que
    gestiona Supabase. Asi que usamos uno real. Si no hay ninguno, el
    test se salta en vez de fallar: no seria culpa del codigo.
    """
    row = conn.execute(
        "select id from profiles where role = 'coach' limit 1"
    ).fetchone()
    if row is None:
        pytest.skip("no hay ningun coach en la base de datos")
    return row["id"]


@pytest.fixture
def athlete(conn):
    """Un atleta que ya existe en la base de datos."""
    row = conn.execute(
        "select id from profiles where role = 'athlete' limit 1"
    ).fetchone()
    if row is None:
        pytest.skip("no hay ningun atleta en la base de datos")
    return row["id"]


@pytest.fixture
def proximo_lunes():
    """start_date tiene que ser lunes: lo exige el CHECK de la tabla."""
    hoy = datetime.date.today()
    return hoy + datetime.timedelta(days=(7 - hoy.weekday()) % 7)


@pytest.fixture
def bloque_nuevo(coach, athlete, proximo_lunes):
    """Un Block sin guardar, listo para pasarselo a blocks.create()."""
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
