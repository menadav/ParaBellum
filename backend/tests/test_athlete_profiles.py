"""Tests de la ficha del atleta."""

import datetime

from models import AthleteProfile, Gender
from repositories import athlete_profiles


def una_ficha(athlete_id, **extra):
    datos = dict(
        birth_date=datetime.date(1996, 7, 6),
        phone="600123456",
        city="Barcelona",
        gender=Gender.MALE,
        height_cm=184.0,
        occupation="Operario aeropuerto",
        sports="Voleibol",
        injuries="Ninguna",
        goals="Mas salto vertical",
        best_squat=180.0,
        best_bench=120.0,
        best_deadlift=220.0,
        coach_note="Cuidado con el volumen de rodilla",
    )
    datos.update(extra)
    return AthleteProfile(athlete_id=athlete_id, **datos)


def test_sin_ficha_devuelve_none(conn, coach):
    assert athlete_profiles.get(conn, coach) is None


def test_upsert_crea_la_ficha(conn, athlete):
    athlete_profiles.upsert(conn, una_ficha(athlete))

    f = athlete_profiles.get(conn, athlete)
    assert f is not None
    assert f.city == "Barcelona"
    assert f.gender == Gender.MALE
    assert f.height_cm == 184.0


def test_upsert_dos_veces_actualiza(conn, athlete):
    athlete_profiles.upsert(conn, una_ficha(athlete))
    athlete_profiles.upsert(conn, una_ficha(athlete, city="Madrid"))

    assert athlete_profiles.get(conn, athlete).city == "Madrid"


def test_los_numeros_llegan_como_float(conn, athlete):
    athlete_profiles.upsert(conn, una_ficha(athlete, best_squat=182.5))

    f = athlete_profiles.get(conn, athlete)
    assert isinstance(f.best_squat, float)
    assert f.best_squat == 182.5


def test_la_edad_se_calcula_sola(conn, athlete):
    """No se guarda: cambiaria de valor cada cumpleanos."""
    athlete_profiles.upsert(conn, una_ficha(athlete))

    f = athlete_profiles.get(conn, athlete)
    esperada = datetime.date.today().year - 1996
    assert f.age in (esperada, esperada - 1)


def test_el_total_suma_las_tres_marcas(conn, athlete):
    athlete_profiles.upsert(conn, una_ficha(athlete))

    assert athlete_profiles.get(conn, athlete).total == 520.0


def test_sin_las_tres_marcas_no_hay_total(conn, athlete):
    athlete_profiles.upsert(conn, una_ficha(athlete, best_bench=None))

    assert athlete_profiles.get(conn, athlete).total is None


def test_no_se_puede_borrar_un_atleta_con_bloques(conn, athlete):
    """Protege el historico: blocks.athlete_id no tiene cascade.

    Borrar a un atleta que ha entrenado dejaria bloques huerfanos, asi
    que Postgres lo impide. Para dar de baja se usa status='inactive',
    que conserva todo lo que hizo.
    """
    import psycopg
    import pytest

    athlete_profiles.upsert(conn, una_ficha(athlete))
    conn.execute(
        "insert into blocks (name, coach_id, athlete_id, total_weeks, "
        "start_date) select 'x', coach_id, %s, 4, '2026-09-07' "
        "from profiles where id = %s",
        (athlete, athlete),
    )

    with pytest.raises(psycopg.errors.ForeignKeyViolation):
        conn.execute("delete from profiles where id = %s", (athlete,))
