"""Tests del repositorio de entrenos."""

import datetime

import psycopg
import pytest

from models import Weekday, Workout, WorkoutStatus
from repositories import blocks, workouts

ID_INVENTADO = 999_999_999


@pytest.fixture
def block_id(conn, bloque_nuevo):
    """Un bloque recien creado al que colgarle entrenos."""
    return blocks.create(conn, bloque_nuevo)


def un_workout(block_id, semana=1, dia=Weekday.MONDAY, nombre="Dia 1"):
    return Workout(
        id=0,
        block_id=block_id,
        name=nombre,
        week_number=semana,
        day_of_week=dia,
        status=WorkoutStatus.PLANNED,
    )


def test_create_devuelve_un_id(conn, block_id):
    nuevo = workouts.create(conn, un_workout(block_id))

    assert isinstance(nuevo, int)
    assert nuevo > 0


def test_get_by_id_recupera_lo_guardado(conn, block_id):
    nuevo = workouts.create(
        conn, un_workout(block_id, semana=3, dia=Weekday.FRIDAY)
    )

    w = workouts.get_by_id(conn, nuevo)

    assert w is not None
    assert w.week_number == 3
    # Traducido a enums, no numeros y texto sueltos.
    assert w.day_of_week == Weekday.FRIDAY
    assert w.status == WorkoutStatus.PLANNED


def test_get_by_id_inexistente_devuelve_none(conn):
    assert workouts.get_by_id(conn, ID_INVENTADO) is None


def test_create_many_los_guarda_todos(conn, block_id):
    """Un bloque de 8 semanas x 4 dias = 32 sesiones."""
    dias = [Weekday.MONDAY, Weekday.TUESDAY,
            Weekday.THURSDAY, Weekday.FRIDAY]
    sesiones = [
        un_workout(block_id, semana=s, dia=d, nombre=f"S{s} D{d}")
        for s in range(1, 9)
        for d in dias
    ]

    workouts.create_many(conn, sesiones)

    assert len(workouts.list_for_block(conn, block_id)) == 32


def test_create_many_con_lista_vacia_no_falla(conn, block_id):
    workouts.create_many(conn, [])

    assert workouts.list_for_block(conn, block_id) == []


def test_get_by_slot_encuentra_por_semana_y_dia(conn, block_id):
    workouts.create(
        conn, un_workout(block_id, semana=5, dia=Weekday.WEDNESDAY)
    )

    w = workouts.get_by_slot(conn, block_id, 5, Weekday.WEDNESDAY)

    assert w is not None
    assert w.week_number == 5
    assert w.day_of_week == Weekday.WEDNESDAY


def test_get_by_slot_de_un_hueco_vacio_devuelve_none(conn, block_id):
    assert workouts.get_by_slot(conn, block_id, 7, Weekday.SUNDAY) is None


def test_list_for_block_viene_en_orden_de_calendario(conn, block_id):
    """Semana 1 lunes, semana 1 viernes, semana 2 lunes..."""
    workouts.create_many(conn, [
        un_workout(block_id, semana=2, dia=Weekday.MONDAY),
        un_workout(block_id, semana=1, dia=Weekday.FRIDAY),
        un_workout(block_id, semana=1, dia=Weekday.MONDAY),
    ])

    orden = [
        (w.week_number, int(w.day_of_week))
        for w in workouts.list_for_block(conn, block_id)
    ]

    assert orden == [(1, 0), (1, 4), (2, 0)]


def test_list_for_week_solo_trae_esa_semana(conn, block_id):
    workouts.create_many(conn, [
        un_workout(block_id, semana=1, dia=Weekday.MONDAY),
        un_workout(block_id, semana=2, dia=Weekday.MONDAY),
        un_workout(block_id, semana=2, dia=Weekday.FRIDAY),
    ])

    semana2 = workouts.list_for_week(conn, block_id, 2)

    assert len(semana2) == 2
    assert all(w.week_number == 2 for w in semana2)


def test_mark_completed_cambia_estado_y_fecha(conn, block_id):
    nuevo = workouts.create(conn, un_workout(block_id))

    workouts.mark_completed(conn, nuevo, "Buenas sensaciones")

    w = workouts.get_by_id(conn, nuevo)
    assert w.status == WorkoutStatus.COMPLETED
    assert w.athlete_notes == "Buenas sensaciones"
    assert isinstance(w.completed_at, datetime.datetime)


def test_no_puede_haber_dos_entrenos_en_el_mismo_hueco(conn, block_id):
    """Lo protege el UNIQUE (block_id, week_number, day_of_week)."""
    workouts.create(
        conn, un_workout(block_id, semana=1, dia=Weekday.MONDAY)
    )

    with pytest.raises(psycopg.errors.UniqueViolation):
        workouts.create(
            conn, un_workout(block_id, semana=1, dia=Weekday.MONDAY)
        )
