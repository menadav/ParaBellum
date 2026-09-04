"""Tests del repositorio de bloques."""

import dataclasses
import datetime

import psycopg
import pytest

from models import Block, BlockStatus
from repositories import blocks

ID_INVENTADO = 999_999_999


def test_create_devuelve_un_id(conn, bloque_nuevo):
    nuevo_id = blocks.create(conn, bloque_nuevo)

    assert isinstance(nuevo_id, int)
    assert nuevo_id > 0


def test_get_by_id_recupera_lo_que_se_guardo(conn, bloque_nuevo):
    nuevo_id = blocks.create(conn, bloque_nuevo)

    b = blocks.get_by_id(conn, nuevo_id)

    assert b is not None
    assert b.id == nuevo_id
    assert b.name == bloque_nuevo.name
    assert b.total_weeks == bloque_nuevo.total_weeks
    assert b.start_date == bloque_nuevo.start_date
    assert b.status == BlockStatus.DRAFT


def test_get_by_id_inexistente_devuelve_none(conn):
    assert blocks.get_by_id(conn, ID_INVENTADO) is None


def test_list_for_coach_incluye_el_bloque_nuevo(conn, coach, bloque_nuevo):
    nuevo_id = blocks.create(conn, bloque_nuevo)

    encontrados = blocks.list_for_coach(conn, coach)

    assert nuevo_id in [b.id for b in encontrados]


def test_list_for_coach_viene_ordenado(conn, coach, bloque_nuevo):
    """Del mas reciente al mas antiguo: es lo que ve el coach."""
    blocks.create(conn, bloque_nuevo)
    otro = dataclasses.replace(
        bloque_nuevo,
        start_date=bloque_nuevo.start_date - datetime.timedelta(weeks=4),
    )
    blocks.create(conn, otro)

    fechas = [b.start_date for b in blocks.list_for_coach(conn, coach)]

    assert fechas == sorted(fechas, reverse=True)


def test_list_for_athlete_incluye_el_bloque_nuevo(
    conn, athlete, bloque_nuevo
):
    nuevo_id = blocks.create(conn, bloque_nuevo)

    encontrados = blocks.list_for_athlete(conn, athlete)

    assert nuevo_id in [b.id for b in encontrados]


def test_un_bloque_en_draft_no_es_el_activo(conn, athlete, bloque_nuevo):
    blocks.create(conn, bloque_nuevo)

    activo = blocks.get_active_for_athlete(conn, athlete)

    assert activo is None or activo.status == BlockStatus.ACTIVE


def test_update_status_cambia_el_estado(conn, bloque_nuevo):
    nuevo_id = blocks.create(conn, bloque_nuevo)

    blocks.update_status(conn, nuevo_id, BlockStatus.COMPLETED)

    assert blocks.get_by_id(conn, nuevo_id).status == BlockStatus.COMPLETED


def test_la_base_de_datos_rechaza_un_inicio_que_no_sea_lunes(
    conn, bloque_nuevo
):
    """Este no prueba tu codigo: prueba tu CHECK.

    El invariante 'los bloques empiezan en lunes' vive en la tabla, y
    esto demuestra que de verdad protege. Aunque manana alguien escriba
    un servicio que se salte la comprobacion, la base de datos no cede.
    """
    martes = dataclasses.replace(
        bloque_nuevo,
        start_date=bloque_nuevo.start_date + datetime.timedelta(days=1),
    )

    with pytest.raises(psycopg.errors.CheckViolation):
        blocks.create(conn, martes)


def test_los_metodos_del_modelo_funcionan_al_leer(conn, bloque_nuevo):
    """El repositorio devuelve un Block de verdad, no un diccionario."""
    nuevo_id = blocks.create(conn, bloque_nuevo)

    b = blocks.get_by_id(conn, nuevo_id)

    assert isinstance(b, Block)
    # 8 semanas desde el lunes -> acaba el domingo de la semana 8.
    assert b.end_date == b.start_date + datetime.timedelta(days=55)
    # El dia 0 (lunes) de la semana 1 es el propio start_date.
    assert b.date_for(1, 0) == b.start_date


def test_no_se_pueden_tener_dos_bloques_activos(
    conn, athlete, bloque_nuevo
):
    """El invariante que destapo un test fallando.

    Antes, activar un segundo bloque no daba error: simplemente
    get_active_for_athlete empezaba a devolver uno cualquiera de los
    dos. Ahora la base de datos lo rechaza.
    """
    # Este test no puede depender de lo que ya haya en la base de
    # datos: si el atleta ya tenia un bloque activo, el primer
    # update_status fallaria y estariamos probando otra cosa. Lo
    # dejamos limpio; el rollback del fixture lo deshace al salir.
    conn.execute(
        "update blocks set status = 'completed' "
        "where athlete_id = %s and status = 'active'",
        (athlete,),
    )

    primero = blocks.create(conn, bloque_nuevo)
    blocks.update_status(conn, primero, BlockStatus.ACTIVE)

    segundo = blocks.create(conn, bloque_nuevo)

    with pytest.raises(psycopg.errors.UniqueViolation):
        blocks.update_status(conn, segundo, BlockStatus.ACTIVE)
