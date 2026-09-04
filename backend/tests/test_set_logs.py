"""Tests de las series registradas."""

import psycopg
import pytest

from models import (
    Exercise, ExerciseDefinition, SetLog, Weekday, Workout,
    WorkoutStatus,
)
from repositories import blocks, exercises, set_logs, workouts
from repositories import exercise_definitions as defs


@pytest.fixture
def definition_id(conn, coach):
    return defs.create(conn, ExerciseDefinition(
        id=0, name="Sentadilla SSB", explanation="Profunda.",
        coach_id=coach,
    ))


@pytest.fixture
def workout_id(conn, bloque_nuevo):
    block_id = blocks.create(conn, bloque_nuevo)
    return workouts.create(conn, Workout(
        id=0, block_id=block_id, name="Dia 1", week_number=1,
        day_of_week=Weekday.MONDAY, status=WorkoutStatus.PLANNED,
    ))


@pytest.fixture
def exercise_id(conn, workout_id, definition_id):
    return exercises.add(conn, Exercise(
        id=0, workout_id=workout_id, definition_id=definition_id,
        position=1,
    ))


def una_serie(exercise_id, numero=1, reps=8, peso=100.0, rpe=8.0):
    return SetLog(
        id=0, exercise_id=exercise_id, set_number=numero,
        reps=reps, weight=peso, rpe=rpe,
    )


def test_upsert_crea_la_serie(conn, exercise_id):
    nuevo = set_logs.upsert(conn, una_serie(exercise_id))

    assert isinstance(nuevo, int)
    assert nuevo > 0


def test_los_pesos_llegan_como_float_no_como_decimal(conn, exercise_id):
    """Sin esta conversion, estimated_1rm reventaria."""
    set_logs.upsert(conn, una_serie(exercise_id, peso=102.5, rpe=8.5))

    s = set_logs.list_for_exercise(conn, exercise_id)[0]

    assert isinstance(s.weight, float)
    assert isinstance(s.rpe, float)
    assert s.weight == 102.5


def test_el_1rm_estimado_del_modelo_funciona(conn, exercise_id):
    """La prueba de que la traduccion sirve para algo."""
    set_logs.upsert(conn, una_serie(exercise_id, reps=5, peso=100.0))

    s = set_logs.list_for_exercise(conn, exercise_id)[0]

    assert s.estimated_1rm == pytest.approx(116.7, abs=0.1)


def test_una_serie_sin_peso_es_valida(conn, exercise_id):
    """Ab wheel, dominadas... no todo lleva carga."""
    set_logs.upsert(conn, SetLog(
        id=0, exercise_id=exercise_id, set_number=1, reps=12,
        weight=None, rpe=None,
    ))

    s = set_logs.list_for_exercise(conn, exercise_id)[0]

    assert s.weight is None
    assert s.estimated_1rm is None


def test_upsert_dos_veces_actualiza_en_vez_de_duplicar(
    conn, exercise_id
):
    """El caso real: el atleta se equivoco al teclear y corrige."""
    primero = set_logs.upsert(conn, una_serie(exercise_id, peso=100.0))
    segundo = set_logs.upsert(conn, una_serie(exercise_id, peso=105.0))

    assert primero == segundo          # es la MISMA fila
    todas = set_logs.list_for_exercise(conn, exercise_id)
    assert len(todas) == 1
    assert todas[0].weight == 105.0


def test_upsert_actualiza_la_hora_al_corregir(conn, exercise_id):
    set_logs.upsert(conn, una_serie(exercise_id, peso=100.0))
    antes = set_logs.list_for_exercise(conn, exercise_id)[0]

    set_logs.upsert(conn, una_serie(exercise_id, peso=105.0))
    despues = set_logs.list_for_exercise(conn, exercise_id)[0]

    assert despues.completed_at >= antes.completed_at


def test_list_for_exercise_viene_en_orden_de_serie(conn, exercise_id):
    for n in (3, 1, 2):
        set_logs.upsert(conn, una_serie(exercise_id, numero=n))

    numeros = [
        s.set_number
        for s in set_logs.list_for_exercise(conn, exercise_id)
    ]

    assert numeros == [1, 2, 3]


def test_list_for_exercise_sin_series_devuelve_vacio(conn, exercise_id):
    assert set_logs.list_for_exercise(conn, exercise_id) == []


def test_list_for_workout_trae_las_de_todos_los_ejercicios(
    conn, workout_id, definition_id, exercise_id
):
    otro = exercises.add(conn, Exercise(
        id=0, workout_id=workout_id, definition_id=definition_id,
        position=2,
    ))
    set_logs.upsert(conn, una_serie(exercise_id, numero=1))
    set_logs.upsert(conn, una_serie(exercise_id, numero=2))
    set_logs.upsert(conn, una_serie(otro, numero=1))

    todas = set_logs.list_for_workout(conn, workout_id)

    assert len(todas) == 3


def test_list_for_workout_ordena_por_ejercicio_y_serie(
    conn, workout_id, definition_id, exercise_id
):
    """Primero el ejercicio 1 entero, luego el 2."""
    otro = exercises.add(conn, Exercise(
        id=0, workout_id=workout_id, definition_id=definition_id,
        position=2,
    ))
    set_logs.upsert(conn, una_serie(otro, numero=1))
    set_logs.upsert(conn, una_serie(exercise_id, numero=2))
    set_logs.upsert(conn, una_serie(exercise_id, numero=1))

    orden = [
        (s.exercise_id, s.set_number)
        for s in set_logs.list_for_workout(conn, workout_id)
    ]

    assert orden == [
        (exercise_id, 1), (exercise_id, 2), (otro, 1),
    ]


def test_delete_quita_la_serie(conn, exercise_id):
    nuevo = set_logs.upsert(conn, una_serie(exercise_id))

    set_logs.delete(conn, nuevo)

    assert set_logs.list_for_exercise(conn, exercise_id) == []


def test_history_trae_lo_del_atleta_en_ese_ejercicio(
    conn, athlete, definition_id, exercise_id
):
    """El JOIN de cuatro tablas: de la serie al atleta."""
    set_logs.upsert(conn, una_serie(exercise_id, numero=1, peso=100.0))
    set_logs.upsert(conn, una_serie(exercise_id, numero=2, peso=105.0))

    h = set_logs.history(conn, athlete, definition_id)

    assert len(h) == 2
    assert {s.weight for s in h} == {100.0, 105.0}


def test_history_de_otro_ejercicio_esta_vacio(
    conn, athlete, coach, exercise_id
):
    set_logs.upsert(conn, una_serie(exercise_id))
    otra_definicion = defs.create(conn, ExerciseDefinition(
        id=0, name="Curl biceps", explanation="x", coach_id=coach,
    ))

    assert set_logs.history(conn, athlete, otra_definicion) == []


def test_borrar_el_ejercicio_se_lleva_sus_series(conn, exercise_id):
    """'on delete cascade': quitar el ejercicio borra sus registros."""
    set_logs.upsert(conn, una_serie(exercise_id))

    exercises.remove(conn, exercise_id)

    assert set_logs.list_for_exercise(conn, exercise_id) == []


def test_la_base_de_datos_rechaza_un_rpe_imposible(conn, exercise_id):
    with pytest.raises(psycopg.errors.CheckViolation):
        set_logs.upsert(conn, una_serie(exercise_id, rpe=15.0))


def test_el_coach_tambien_puede_gestionar_las_series(conn, coach, athlete):
    """Regla de negocio: el atleta registra, el coach puede corregir."""
    from models import Block, BlockStatus
    from services import access

    bloque = Block(
        id=1, name="x", coach_id=coach, athlete_id=athlete,
        total_weeks=8, start_date=None, status=BlockStatus.ACTIVE,
    )
    from repositories import profiles

    assert access.puede_gestionar_series(profiles.get_by_id(conn, coach), bloque)
    assert access.puede_gestionar_series(
        profiles.get_by_id(conn, athlete), bloque
    )


def test_la_serie_guarda_quien_la_escribio(conn, exercise_id, coach):
    """El coach la deja planificada: queda firmada por el."""
    set_logs.upsert(conn, SetLog(
        id=0, exercise_id=exercise_id, set_number=1, reps=8,
        weight=100.0, rpe=7.0, logged_by=coach,
    ))

    s = set_logs.list_for_exercise(conn, exercise_id)[0]
    assert s.logged_by == coach


def test_al_corregirla_cambia_la_firma(conn, exercise_id, coach, athlete):
    """Es lo que distingue 'pendiente' de 'hecha'."""
    set_logs.upsert(conn, SetLog(
        id=0, exercise_id=exercise_id, set_number=1, reps=8,
        weight=100.0, rpe=7.0, logged_by=coach,
    ))

    set_logs.upsert(conn, SetLog(
        id=0, exercise_id=exercise_id, set_number=1, reps=8,
        weight=102.5, rpe=8.0, logged_by=athlete,
    ))

    s = set_logs.list_for_exercise(conn, exercise_id)[0]
    assert s.logged_by == athlete
    assert s.weight == 102.5
