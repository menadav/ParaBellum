import os
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

import psycopg
from dotenv import load_dotenv
from psycopg.rows import dict_row

BACKEND_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BACKEND_DIR / ".env")

DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "Falta DATABASE_URL. Copia backend/.env.example a backend/.env y "
        "pega ahi la cadena de conexion de Supabase "
        "(Connect > Session pooler > URI)."
    )


def connect() -> psycopg.Connection:
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


@contextmanager
def transaction() -> Iterator[psycopg.Connection]:
    with connect() as conn:
        yield conn


def ping() -> dict:
    with transaction() as conn:
        version = conn.execute("select version()").fetchone()["version"]
        tablas = conn.execute(
            "select tablename from pg_tables "
            "where schemaname = 'public' order by tablename"
        ).fetchall()
    return {"version": version, "tablas": [t["tablename"] for t in tablas]}


if __name__ == "__main__":
    print("Conectando a Supabase...")
    info = ping()
    print(info["version"].split(",")[0])
    print(f"{len(info['tablas'])} tablas: {', '.join(info['tablas'])}")
