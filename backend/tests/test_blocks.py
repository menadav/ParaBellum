
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
    martes = dataclasses.replace(
        bloque_nuevo,
        start_date=bloque_nuevo.start_date + datetime.timedelta(days=1),
    )

    with pytest.raises(psycopg.errors.CheckViolation):
        blocks.create(conn, martes)


def test_los_metodos_del_modelo_funcionan_al_leer(conn, bloque_nuevo):
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


def test_update_cambia_las_semanas(conn, bloque_nuevo):
    nuevo_id = blocks.create(conn, bloque_nuevo)

    blocks.update(conn, nuevo_id, total_weeks=12)

    b = blocks.get_by_id(conn, nuevo_id)
    assert b.total_weeks == 12
    # end_date es una property: se recalcula sola.
    assert b.end_date == b.start_date + datetime.timedelta(days=83)


def test_update_no_pisa_lo_que_no_se_manda(conn, bloque_nuevo):
    nuevo_id = blocks.create(conn, bloque_nuevo)

    blocks.update(conn, nuevo_id, total_weeks=10)

    b = blocks.get_by_id(conn, nuevo_id)
    assert b.name == bloque_nuevo.name
    assert b.total_weeks == 10


def test_count_from_week_cuenta_las_sesiones_que_sobrarian(
    conn, bloque_nuevo
):
    from models import Weekday, Workout, WorkoutStatus
    from repositories import workouts

    nuevo_id = blocks.create(conn, bloque_nuevo)
    workouts.create_many(conn, [
        Workout(
            id=0, block_id=nuevo_id, name=f"S{s}", week_number=s,
            day_of_week=Weekday.MONDAY, status=WorkoutStatus.PLANNED,
        )
        for s in (1, 2, 6, 7, 8)
    ])

    assert workouts.count_from_week(conn, nuevo_id, 6) == 3
    assert workouts.count_from_week(conn, nuevo_id, 9) == 0
    assert workouts.max_week(conn, nuevo_id) == 8


def test_stats_cuenta_lo_que_se_perderia(conn, bloque_nuevo, coach):
    from models import (
        Exercise, ExerciseDefinition, SetLog, Weekday, Workout,
        WorkoutStatus,
    )
    from repositories import exercises, set_logs, workouts
    from repositories import exercise_definitions as defs

    block_id = blocks.create(conn, bloque_nuevo)
    w = workouts.create(conn, Workout(
        id=0, block_id=block_id, name="Dia 1", week_number=1,
        day_of_week=Weekday.MONDAY, status=WorkoutStatus.PLANNED,
    ))
    d = defs.create(conn, ExerciseDefinition(
        id=0, name="Sentadilla", explanation="x", coach_id=coach,
    ))
    e = exercises.add(conn, Exercise(
        id=0, workout_id=w, definition_id=d, position=1,
    ))
    set_logs.upsert(conn, SetLog(
        id=0, exercise_id=e, set_number=1, reps=8, weight=100.0,
    ))

    s = blocks.stats(conn, block_id)
    assert s["workouts"] == 1
    assert s["exercises"] == 1
    assert s["logs"] == 1


def test_delete_se_lleva_todo_por_delante(conn, bloque_nuevo, coach):
    from models import Weekday, Workout, WorkoutStatus
    from repositories import workouts

    block_id = blocks.create(conn, bloque_nuevo)
    w = workouts.create(conn, Workout(
        id=0, block_id=block_id, name="Dia 1", week_number=1,
        day_of_week=Weekday.MONDAY, status=WorkoutStatus.PLANNED,
    ))

    blocks.delete(conn, block_id)

    assert blocks.get_by_id(conn, block_id) is None
    assert workouts.get_by_id(conn, w) is None


def test_stats_de_un_bloque_vacio_cuenta_ceros(conn, bloque_nuevo):
    block_id = blocks.create(conn, bloque_nuevo)

    s = blocks.stats(conn, block_id)

    assert (s["workouts"], s["exercises"], s["logs"]) == (0, 0, 0)
