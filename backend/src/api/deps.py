from typing import Iterator
import psycopg
import db


def get_conn() -> Iterator[psycopg.Connection]:
    with db.transaction() as conn:
        yield conn
