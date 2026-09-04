
import psycopg
import pytest

from models import (
    Exercise, ExerciseDefinition, Weekday, Workout, WorkoutStatus,
)
from repositories import blocks, exercise_definitions as defs
from repositories import exercises, workouts

ID_INVENTADO = 999_999_999


@pytest.fixture
def workout_id(conn, bloque_nuevo):
    block_id = blocks.create(conn, bloque_nuevo)
    return workouts.create(conn, Workout(
        id=0, block_id=block_id, name="Dia 1", week_number=1,
        day_of_week=Weekday.MONDAY, status=WorkoutStatus.PLANNED,
    ))


@pytest.fixture
def definition_id(conn, coach):
    return defs.create(conn, ExerciseDefinition(
        id=0, name="Sentadilla", explanation="Profundidad completa.",
        coach_id=coach,
    ))


def mete(conn, workout_id, definition_id, position, notas=None):
    return exercises.add(conn, Exercise(
        id=0,
        workout_id=workout_id,
        definition_id=definition_id,
        position=position,
        notes=notas,
    ))


def test_add_devuelve_un_id(conn, workout_id, definition_id):
    nuevo = mete(conn, workout_id, definition_id, 1)

    assert isinstance(nuevo, int)
    assert nuevo > 0


def test_list_for_workout_los_trae_en_orden(
    conn, workout_id, definition_id
):
    mete(conn, workout_id, definition_id, 3, "tercero")
    mete(conn, workout_id, definition_id, 1, "primero")
    mete(conn, workout_id, definition_id, 2, "segundo")

    lista = exercises.list_for_workout(conn, workout_id)

    assert [e.notes for e in lista] == ["primero", "segundo", "tercero"]


def test_list_de_un_entreno_vacio_devuelve_lista_vacia(conn, workout_id):
    assert exercises.list_for_workout(conn, workout_id) == []


def test_next_position_de_un_entreno_vacio_es_1(conn, workout_id):
    assert exercises.next_position(conn, workout_id) == 1


def test_next_position_va_despues_del_ultimo(
    conn, workout_id, definition_id
):
    mete(conn, workout_id, definition_id, 1)
    mete(conn, workout_id, definition_id, 2)

    assert exercises.next_position(conn, workout_id) == 3


def test_next_position_cuenta_solo_su_entreno(
    conn, workout_id, definition_id
):
    block_id = workouts.get_by_id(conn, workout_id).block_id
    otro = workouts.create(conn, Workout(
        id=0, block_id=block_id, name="Dia 2", week_number=1,
        day_of_week=Weekday.THURSDAY, status=WorkoutStatus.PLANNED,
    ))
    mete(conn, workout_id, definition_id, 1)
    mete(conn, workout_id, definition_id, 2)

    assert exercises.next_position(conn, otro) == 1


def test_no_puede_haber_dos_en_la_misma_posicion(
    conn, workout_id, definition_id
):
    mete(conn, workout_id, definition_id, 1)

    with pytest.raises(psycopg.errors.UniqueViolation):
        mete(conn, workout_id, definition_id, 1)


def test_remove_lo_saca_del_entreno(conn, workout_id, definition_id):
    uno = mete(conn, workout_id, definition_id, 1)
    mete(conn, workout_id, definition_id, 2)

    exercises.remove(conn, uno)

    quedan = exercises.list_for_workout(conn, workout_id)
    assert len(quedan) == 1
    assert uno not in [e.id for e in quedan]


def test_reorder_le_da_la_vuelta_a_la_lista(
    conn, workout_id, definition_id
):
    a = mete(conn, workout_id, definition_id, 1, "A")
    b = mete(conn, workout_id, definition_id, 2, "B")
    c = mete(conn, workout_id, definition_id, 3, "C")

    exercises.reorder(conn, workout_id, [c, a, b])

    lista = exercises.list_for_workout(conn, workout_id)
    assert [e.notes for e in lista] == ["C", "A", "B"]
    assert [e.position for e in lista] == [1, 2, 3]


def test_reorder_deja_posiciones_consecutivas_desde_1(
    conn, workout_id, definition_id
):
    a = mete(conn, workout_id, definition_id, 1, "A")
    b = mete(conn, workout_id, definition_id, 5, "B")
    c = mete(conn, workout_id, definition_id, 9, "C")

    exercises.reorder(conn, workout_id, [a, b, c])

    posiciones = [
        e.position for e in exercises.list_for_workout(conn, workout_id)
    ]
    assert posiciones == [1, 2, 3]


def test_reorder_con_lista_vacia_no_toca_nada(
    conn, workout_id, definition_id
):
    mete(conn, workout_id, definition_id, 1, "A")

    exercises.reorder(conn, workout_id, [])

    lista = exercises.list_for_workout(conn, workout_id)
    assert [e.position for e in lista] == [1]


def test_borrar_el_entreno_se_lleva_sus_ejercicios(
    conn, workout_id, definition_id
):
    mete(conn, workout_id, definition_id, 1)

    conn.execute("delete from workouts where id = %s", (workout_id,))

    assert exercises.list_for_workout(conn, workout_id) == []
