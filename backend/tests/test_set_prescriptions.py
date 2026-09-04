
import psycopg
import pytest

from models import (
    Exercise, ExerciseDefinition, SetPrescription, Weekday, Workout,
    WorkoutStatus,
)
from repositories import blocks, exercises, set_prescriptions, workouts
from repositories import exercise_definitions as defs


@pytest.fixture
def workout_id(conn, bloque_nuevo):
    block_id = blocks.create(conn, bloque_nuevo)
    return workouts.create(conn, Workout(
        id=0, block_id=block_id, name="Dia 1", week_number=1,
        day_of_week=Weekday.MONDAY, status=WorkoutStatus.PLANNED,
    ))


@pytest.fixture
def exercise_id(conn, workout_id, coach):
    definition_id = defs.create(conn, ExerciseDefinition(
        id=0, name="Press banca", explanation="Barra al pecho.",
        coach_id=coach,
    ))
    return exercises.add(conn, Exercise(
        id=0, workout_id=workout_id, definition_id=definition_id,
        position=1,
    ))


def serie(exercise_id, n, reps=8, peso=100.0, rpe=7.0):
    return SetPrescription(
        id=0, exercise_id=exercise_id, set_number=n,
        target_reps=reps, target_weight=peso, target_rpe=rpe,
    )


def test_replace_guarda_las_series(conn, exercise_id):
    set_prescriptions.replace_for_exercise(conn, exercise_id, [
        serie(exercise_id, n) for n in (1, 2, 3, 4)
    ])

    p = set_prescriptions.list_for_exercise(conn, exercise_id)
    assert len(p) == 4
    assert [s.set_number for s in p] == [1, 2, 3, 4]
    assert p[0].target_reps == 8
    assert p[0].target_rpe == 7.0


def test_los_pesos_llegan_como_float(conn, exercise_id):
    set_prescriptions.replace_for_exercise(
        conn, exercise_id, [serie(exercise_id, 1, peso=102.5, rpe=8.5)]
    )

    p = set_prescriptions.list_for_exercise(conn, exercise_id)[0]
    assert isinstance(p.target_weight, float)
    assert p.target_weight == 102.5
    assert p.target_rpe == 8.5


def test_replace_sustituye_lo_anterior(conn, exercise_id):
    set_prescriptions.replace_for_exercise(conn, exercise_id, [
        serie(exercise_id, n) for n in (1, 2, 3, 4)
    ])

    set_prescriptions.replace_for_exercise(conn, exercise_id, [
        serie(exercise_id, n, reps=10) for n in (1, 2, 3)
    ])

    p = set_prescriptions.list_for_exercise(conn, exercise_id)
    assert len(p) == 3
    assert all(s.target_reps == 10 for s in p)


def test_replace_con_lista_vacia_las_borra_todas(conn, exercise_id):
    set_prescriptions.replace_for_exercise(
        conn, exercise_id, [serie(exercise_id, 1)]
    )

    set_prescriptions.replace_for_exercise(conn, exercise_id, [])

    assert set_prescriptions.list_for_exercise(conn, exercise_id) == []


def test_una_serie_puede_no_llevar_peso(conn, exercise_id):
    set_prescriptions.replace_for_exercise(conn, exercise_id, [
        SetPrescription(
            id=0, exercise_id=exercise_id, set_number=1,
            target_reps=12, target_weight=None, target_rpe=9.0,
        )
    ])

    p = set_prescriptions.list_for_exercise(conn, exercise_id)[0]
    assert p.target_weight is None
    assert p.target_rpe == 9.0


def test_list_for_workout_trae_las_de_todos_los_ejercicios(
    conn, workout_id, exercise_id, coach
):
    otra_def = defs.create(conn, ExerciseDefinition(
        id=0, name="Remo", explanation="x", coach_id=coach,
    ))
    otro = exercises.add(conn, Exercise(
        id=0, workout_id=workout_id, definition_id=otra_def, position=2,
    ))
    set_prescriptions.replace_for_exercise(conn, exercise_id, [
        serie(exercise_id, 1), serie(exercise_id, 2),
    ])
    set_prescriptions.replace_for_exercise(conn, otro, [serie(otro, 1)])

    todas = set_prescriptions.list_for_workout(conn, workout_id)

    assert len(todas) == 3
    # Ordenadas por posicion del ejercicio y luego por numero de serie.
    assert [s.exercise_id for s in todas] == [
        exercise_id, exercise_id, otro
    ]


def test_no_puede_haber_dos_series_con_el_mismo_numero(
    conn, exercise_id
):
    with pytest.raises(psycopg.errors.UniqueViolation):
        set_prescriptions.replace_for_exercise(conn, exercise_id, [
            serie(exercise_id, 1), serie(exercise_id, 1),
        ])


def test_borrar_el_ejercicio_se_lleva_sus_prescripciones(
    conn, exercise_id
):
    set_prescriptions.replace_for_exercise(
        conn, exercise_id, [serie(exercise_id, 1)]
    )

    exercises.remove(conn, exercise_id)

    assert set_prescriptions.list_for_exercise(conn, exercise_id) == []
