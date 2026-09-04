import datetime

import pytest

from repositories import invitations


def test_create_devuelve_una_invitacion_con_token(conn, coach):
    inv = invitations.create(conn, coach, email="a@b.com", name="Pedro")

    assert inv.id > 0
    assert len(inv.token) >= 32
    assert inv.coach_id == coach
    assert inv.email == "a@b.com"
    assert inv.usable


def test_cada_invitacion_tiene_un_token_distinto(conn, coach):
    a = invitations.create(conn, coach)
    b = invitations.create(conn, coach)

    assert a.token != b.token


def test_get_by_token_la_encuentra(conn, coach):
    inv = invitations.create(conn, coach, name="Pedro")

    encontrada = invitations.get_by_token(conn, inv.token)

    assert encontrada is not None
    assert encontrada.id == inv.id
    assert encontrada.name == "Pedro"


def test_un_token_inventado_no_devuelve_nada(conn):
    assert invitations.get_by_token(conn, "no-existe") is None


def test_una_invitacion_caducada_no_es_usable(conn, coach):
    inv = invitations.create(conn, coach, dias=1)
    # Hay que mover las dos: el CHECK exige expires_at > created_at.
    conn.execute(
        "update invitations set "
        "  created_at = now() - interval '40 days', "
        "  expires_at = now() - interval '10 days' "
        "where id = %s",
        (inv.id,),
    )

    caducada = invitations.get_by_token(conn, inv.token)
    assert caducada.expired
    assert not caducada.usable


def test_una_invitacion_aceptada_no_es_usable(conn, coach, athlete):
    inv = invitations.create(conn, coach)
    conn.execute(
        "update invitations set accepted_at = now(), accepted_by = %s "
        "where id = %s",
        (athlete, inv.id),
    )

    aceptada = invitations.get_by_token(conn, inv.token)
    assert aceptada.accepted
    assert not aceptada.usable


def test_list_for_coach_solo_trae_las_suyas(conn, coach):
    inv = invitations.create(conn, coach)

    mias = invitations.list_for_coach(conn, coach)

    assert inv.id in [i.id for i in mias]
    assert all(i.coach_id == coach for i in mias)


def test_delete_la_quita(conn, coach):
    inv = invitations.create(conn, coach)

    invitations.delete(conn, inv.id)

    assert invitations.get_by_token(conn, inv.token) is None


def test_la_caducidad_tiene_que_ser_posterior_a_la_creacion(conn, coach):
    import psycopg

    inv = invitations.create(conn, coach)
    with pytest.raises(psycopg.errors.CheckViolation):
        conn.execute(
            "update invitations set expires_at = created_at - "
            "interval '1 day' where id = %s",
            (inv.id,),
        )
