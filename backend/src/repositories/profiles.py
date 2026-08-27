"""Repositorio de perfiles: traduce entre la tabla 'profiles' y User.

Es el unico sitio del backend que sabe que la tabla se llama 'profiles'
y como se llaman sus columnas. Fuera de aqui todo el mundo habla de User.
"""

import uuid
from typing import Optional

import psycopg

from models import AthleteStatus, Role, User, WeightUnit

# Las columnas, escritas una sola vez. Nunca "select *": si manana
# alguien anade una columna, el * cambia la forma de la fila sin avisar.
_COLUMNS = "id, name, email, role, coach_id, status, weight_unit"


def _row_to_user(row: dict) -> User:
    """Convierte una fila de la base de datos en un objeto User.

    Esta es LA funcion del repositorio: aqui es donde el texto plano de
    Postgres ('athlete') se convierte en algo de Python (Role.ATHLETE).
    El uuid ya llega como uuid.UUID, de eso se encarga psycopg.
    """
    return User(
        id=row["id"],
        name=row["name"],
        email=row["email"],
        role=Role(row["role"]),
        coach_id=row["coach_id"],
        status=AthleteStatus(row["status"]),
        weight_unit=WeightUnit(row["weight_unit"]),
    )


def get_by_id(
    conn: psycopg.Connection, user_id: uuid.UUID
) -> Optional[User]:
    """Busca un usuario por su id. None si no existe.

    Fijate en el %s: en psycopg los huecos se marcan asi, no con ? como
    en SQLite. Y los valores van SIEMPRE en la tupla de despues, nunca
    pegados al texto con f-strings: eso seria una inyeccion SQL.
    """
    row = conn.execute(
        f"select {_COLUMNS} from profiles where id = %s",
        (user_id,),
    ).fetchone()
    return _row_to_user(row) if row else None


# ---------------------------------------------------------------------
# A partir de aqui te toca a ti. El patron ya lo tienes arriba.
# ---------------------------------------------------------------------


def get_by_email(
    conn: psycopg.Connection, email: str
) -> Optional[User]:
    """Busca un usuario por su email. None si no existe.

    Casi identico a get_by_id: cambia la columna del where.
    """
    raise NotImplementedError


def list_athletes(
    conn: psycopg.Connection, coach_id: uuid.UUID
) -> list[User]:
    """Todos los atletas de un coach, ordenados por nombre.

    Pistas:
      - fetchall() en vez de fetchone()
      - devuelve una lista, y si no hay ninguno devuelve [] (no None)
      - order by name
    """
    raise NotImplementedError


def update_status(
    conn: psycopg.Connection,
    user_id: uuid.UUID,
    status: AthleteStatus,
) -> None:
    """Cambia el estado de un usuario (aceptar invitacion, dar de baja).

    Pistas:
      - es un UPDATE, no devuelve nada
      - status es un enum: a la base de datos hay que pasarle status.value
    """
    raise NotImplementedError


# Nota: no hay create().
#
# Los perfiles no se crean desde aqui: los crea solo el trigger
# on_auth_user_created cuando alguien se registra en Supabase Auth.
# Si escribieras un create() tendrias dos caminos para crear un usuario
# y antes o despues se contradirian.
