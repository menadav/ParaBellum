from typing import Iterator
import psycopg
import db


def get_conn() -> Iterator[psycopg.Connection]:
    # Del pool, no una conexion nueva: abrir una cuesta ~225 ms.
    with db.prestada() as conn:
        yield conn
