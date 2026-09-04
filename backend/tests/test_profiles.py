"""Tests del repositorio de perfiles."""

import uuid

from models import AthleteStatus, Role, User
from repositories import profiles

ID_INVENTADO = uuid.UUID("00000000-0000-0000-0000-000000000000")


def test_get_by_id_devuelve_un_user(conn, coach):
    u = profiles.get_by_id(conn, coach)

    assert u is not None
    assert isinstance(u, User)
    assert u.id == coach
    # Lo importante del repositorio: traduce el texto a un enum.
    assert isinstance(u.role, Role)


def test_get_by_id_inexistente_devuelve_none(conn):
    assert profiles.get_by_id(conn, ID_INVENTADO) is None


def test_get_by_email_encuentra_al_mismo(conn, coach):
    """Buscar por id y por email tiene que dar el mismo usuario."""
    por_id = profiles.get_by_id(conn, coach)
    por_email = profiles.get_by_email(conn, por_id.email)

    assert por_email is not None
    assert por_email.id == por_id.id


def test_get_by_email_inexistente_devuelve_none(conn):
    assert profiles.get_by_email(conn, "no.existe@nada.com") is None


def test_list_athletes_devuelve_lista(conn, coach):
    atletas = profiles.list_athletes(conn, coach)

    assert isinstance(atletas, list)
    # Todos los devueltos tienen que ser atletas de ESE coach.
    for a in atletas:
        assert a.coach_id == coach
        assert a.role == Role.ATHLETE


def test_list_athletes_de_un_coach_sin_atletas_devuelve_vacio(conn):
    """Vacio es [], nunca None: quien llama debe poder hacer un for."""
    assert profiles.list_athletes(conn, ID_INVENTADO) == []


def test_update_status_cambia_el_estado(conn, athlete):
    profiles.update_status(conn, athlete, AthleteStatus.INACTIVE)

    u = profiles.get_by_id(conn, athlete)
    assert u.status == AthleteStatus.INACTIVE
    # No hace falta deshacerlo: el rollback del fixture ya lo hace.
