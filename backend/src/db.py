import os
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator, Optional

import psycopg
from dotenv import load_dotenv
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

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
    # Conexion suelta. La usan los scripts, que arrancan, hacen su
    # trabajo y salen: montar un pool para eso no aporta nada.
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


@contextmanager
def transaction() -> Iterator[psycopg.Connection]:
    with connect() as conn:
        yield conn


# ---------------------------------------------------------------------
# Pool para la API
#
# Abrir una conexion cuesta ~225 ms de saludo TLS y autenticacion, y
# las consultas de una peticion tipica son ~77 ms. Hacerlo en cada
# peticion es pagar tres veces mas por saludar que por trabajar.
#
# El pool las mantiene abiertas y las presta. Lo abre y lo cierra el
# ciclo de vida de FastAPI, no cada peticion.
# ---------------------------------------------------------------------

# Supabase cuenta cada conexion abierta, asi que el techo va bajo: con
# 50 atletas nunca hay 10 peticiones a la vez de verdad.
POOL_MAX = int(os.environ.get("DB_POOL_MAX", "10"))
POOL_MIN = int(os.environ.get("DB_POOL_MIN", "2"))

_pool: Optional[ConnectionPool] = None


def abrir_pool() -> None:
    global _pool
    if _pool is not None:
        return
    _pool = ConnectionPool(
        DATABASE_URL,
        min_size=POOL_MIN,
        max_size=POOL_MAX,
        kwargs={"row_factory": dict_row},
        # Comprueba que la conexion sigue viva antes de prestarla: las
        # que llevan rato paradas puede haberlas cortado Supabase.
        check=ConnectionPool.check_connection,
        open=True,
    )
    _pool.wait(timeout=30)


def cerrar_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None


@contextmanager
def prestada() -> Iterator[psycopg.Connection]:
    # Si el pool no esta abierto (tests, un script), cae a una conexion
    # suelta en vez de fallar.
    if _pool is None:
        with connect() as conn:
            yield conn
        return
    with _pool.connection() as conn:
        yield conn


def estado_pool() -> dict:
    if _pool is None:
        return {"pool": "cerrado"}
    datos = _pool.get_stats()
    return {
        "pool": "abierto",
        "en_uso": datos.get("pool_size", 0) - datos.get("pool_available", 0),
        "disponibles": datos.get("pool_available", 0),
        "maximo": POOL_MAX,
    }


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
