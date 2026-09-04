
import uuid

import psycopg
import pytest

from models import ExerciseDefinition
from repositories import exercise_definitions as defs

ID_INVENTADO = 999_999_999


def una_definicion(nombre="Sentadilla con SSB", coach_id=None,
                   muscle_group="cuadriceps"):
    return ExerciseDefinition(
        id=0,
        name=nombre,
        explanation="Barra alta, profundidad completa.",
        coach_id=coach_id,
        muscle_group=muscle_group,
        video_url=None,
        image_url=None,
    )


def test_create_devuelve_un_id(conn, coach):
    nuevo = defs.create(conn, una_definicion(coach_id=coach))

    assert isinstance(nuevo, int)
    assert nuevo > 0


def test_get_by_id_recupera_lo_guardado(conn, coach):
    nuevo = defs.create(conn, una_definicion(coach_id=coach))

    d = defs.get_by_id(conn, nuevo)

    assert d is not None
    assert d.name == "Sentadilla con SSB"
    assert d.coach_id == coach
    assert d.muscle_group == "cuadriceps"


def test_get_by_id_inexistente_devuelve_none(conn):
    assert defs.get_by_id(conn, ID_INVENTADO) is None


def test_un_ejercicio_global_no_tiene_coach(conn):
    nuevo = defs.create(conn, una_definicion(nombre="Press banca"))

    assert defs.get_by_id(conn, nuevo).coach_id is None


def test_search_encuentra_los_propios(conn, coach):
    defs.create(conn, una_definicion(nombre="Hack Squat", coach_id=coach))

    encontrados = defs.search(conn, coach, "hack")

    assert "Hack Squat" in [d.name for d in encontrados]


def test_search_encuentra_los_globales(conn, coach):
    defs.create(conn, una_definicion(nombre="Peso muerto rumano"))

    encontrados = defs.search(conn, coach, "rumano")

    assert "Peso muerto rumano" in [d.name for d in encontrados]


def test_search_no_encuentra_los_de_otro_coach(conn, coach):
    otro_coach = uuid.UUID("11111111-1111-1111-1111-111111111111")
    defs.create(conn, una_definicion(
        nombre="Ejercicio secreto", coach_id=coach
    ))

    encontrados = defs.search(conn, otro_coach, "secreto")

    assert encontrados == []


def test_search_no_distingue_mayusculas(conn, coach):
    defs.create(conn, una_definicion(nombre="Zancadas", coach_id=coach))

    assert defs.search(conn, coach, "ZANCADAS")
    assert defs.search(conn, coach, "zancadas")
    assert defs.search(conn, coach, "ZaNcA")


def test_search_sin_texto_devuelve_todo_el_catalogo(conn, coach):
    defs.create(conn, una_definicion(nombre="Remo con barra"))
    defs.create(conn, una_definicion(nombre="Curl biceps", coach_id=coach))

    nombres = [d.name for d in defs.search(conn, coach)]

    assert "Remo con barra" in nombres
    assert "Curl biceps" in nombres


def test_search_filtra_por_grupo_muscular(conn, coach):
    defs.create(conn, una_definicion(
        nombre="Prensa", coach_id=coach, muscle_group="cuadriceps"
    ))
    defs.create(conn, una_definicion(
        nombre="Face pull", coach_id=coach, muscle_group="hombro"
    ))

    solo_hombro = defs.search(conn, coach, muscle_group="hombro")

    assert "Face pull" in [d.name for d in solo_hombro]
    assert "Prensa" not in [d.name for d in solo_hombro]


def test_search_viene_ordenado_por_nombre(conn, coach):
    nombres = [d.name for d in defs.search(conn, coach)]

    assert nombres == sorted(nombres)


def test_delete_lo_quita_del_catalogo(conn, coach):
    nuevo = defs.create(conn, una_definicion(coach_id=coach))

    defs.delete(conn, nuevo)

    assert defs.get_by_id(conn, nuevo) is None


def test_no_se_puede_borrar_un_ejercicio_en_uso(
    conn, coach, bloque_nuevo
):
    from models import Weekday, Workout, WorkoutStatus
    from repositories import blocks, workouts

    block_id = blocks.create(conn, bloque_nuevo)
    workout_id = workouts.create(conn, Workout(
        id=0, block_id=block_id, name="Dia 1", week_number=1,
        day_of_week=Weekday.MONDAY, status=WorkoutStatus.PLANNED,
    ))
    definition_id = defs.create(conn, una_definicion(coach_id=coach))

    conn.execute(
        "insert into exercises (workout_id, definition_id, position) "
        "values (%s, %s, 1)",
        (workout_id, definition_id),
    )

    with pytest.raises(psycopg.errors.ForeignKeyViolation):
        defs.delete(conn, definition_id)
