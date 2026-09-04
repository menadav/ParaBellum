"""La API de ParaBellum.

    uvicorn api.main:app --reload --app-dir backend/src --port 8020
    http://localhost:8020/docs

Todos los endpoints menos /health exigen un token de Supabase. En /docs
hay un boton "Authorize" arriba a la derecha para pegarlo.
"""

import os
import uuid

import psycopg
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from api.auth import get_current_user, require_coach
from api.deps import get_conn
from api.schemas import (
    BlockCreate, BlockOut, ExerciseCreate, ExerciseDefinitionOut,
    ExerciseOut, SetLogCreate, SetLogOut, StatusUpdate, UserOut,
    WorkoutOut, WorkoutsGenerate,
)
from models import Block, BlockStatus, Exercise, SetLog, User
from repositories import blocks, exercises, profiles
from repositories import exercise_definitions as defs
from repositories import set_logs, workouts
from services import access, planning

app = FastAPI(
    title="ParaBellum Coaching",
    description="API de la plataforma de entrenamiento.",
    version="0.2.0",
)


# ---------------------------------------------------------------------
# CORS
#
# Por seguridad, un navegador NO deja que una pagina en un dominio
# llame a una API de otro dominio, salvo que la API diga expresamente
# que lo permite. Sin esto, tu frontend recibiria un error de red que
# parece un fallo tuyo y no lo es.
#
# Los origenes permitidos salen de una variable de entorno, porque en
# local sera localhost y en produccion tu dominio de verdad.
# ---------------------------------------------------------------------

_origenes = os.environ.get(
    "CORS_ORIGINS", "http://localhost:3000,http://localhost:5173"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origenes if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------
# Ayudas: cargar algo y comprobar de paso que es tuyo.
#
# El patron 404-antes-que-403 es deliberado: si "no existe" y "existe
# pero no es tuyo" dieran respuestas distintas, cualquiera podria
# averiguar que bloques existen probando ids. Si no es tuyo, para ti
# no existe.
# ---------------------------------------------------------------------


def _bloque_visible(
    conn: psycopg.Connection, block_id: int, usuario: User
) -> Block:
    bloque = blocks.get_by_id(conn, block_id)
    if bloque is None or not access.puede_ver_bloque(usuario, bloque):
        raise HTTPException(404, "Ese bloque no existe")
    return bloque


def _bloque_editable(
    conn: psycopg.Connection, block_id: int, usuario: User
) -> Block:
    bloque = _bloque_visible(conn, block_id, usuario)
    if not access.puede_editar_bloque(usuario, bloque):
        raise HTTPException(403, "Solo el coach del bloque puede editarlo")
    return bloque


# ---------------------------------------------------------------------
# Sistema
# ---------------------------------------------------------------------


@app.get("/health", tags=["sistema"])
def health(conn: psycopg.Connection = Depends(get_conn)) -> dict:
    """Sin token: es lo que consulta el servidor de deploy."""
    conn.execute("select 1")
    return {"status": "ok", "database": "conectada"}


# ---------------------------------------------------------------------
# Quien soy
# ---------------------------------------------------------------------


@app.get("/me", tags=["perfil"])
def yo(usuario: User = Depends(get_current_user)) -> UserOut:
    """El usuario del token. La primera llamada que hara la app."""
    return usuario


@app.get("/me/athletes", tags=["perfil"])
def mis_atletas(
    coach: User = Depends(require_coach),
    conn: psycopg.Connection = Depends(get_conn),
) -> list[UserOut]:
    """Mis atletas.

    Antes esto era /coaches/{coach_id}/athletes y cualquiera podia
    poner el uuid de otro. Ahora el uuid sale del token: no hay nada
    que falsear, solo puedes pedir lo tuyo.
    """
    return profiles.list_athletes(conn, coach.id)


# ---------------------------------------------------------------------
# Bloques
# ---------------------------------------------------------------------


@app.get("/me/blocks", tags=["bloques"])
def mis_bloques(
    usuario: User = Depends(get_current_user),
    conn: psycopg.Connection = Depends(get_conn),
) -> list[BlockOut]:
    """Mis bloques: los que entreno, o los que he creado."""
    if usuario.role.value == "coach":
        return blocks.list_for_coach(conn, usuario.id)
    return blocks.list_for_athlete(conn, usuario.id)


@app.get("/me/blocks/active", tags=["bloques"])
def mi_bloque_activo(
    usuario: User = Depends(get_current_user),
    conn: psycopg.Connection = Depends(get_conn),
) -> BlockOut:
    """El bloque que estoy entrenando. La pantalla de inicio."""
    bloque = blocks.get_active_for_athlete(conn, usuario.id)
    if bloque is None:
        raise HTTPException(404, "No tienes ningun bloque activo")
    return bloque


@app.get("/athletes/{athlete_id}/blocks", tags=["bloques"])
def bloques_de_un_atleta(
    athlete_id: uuid.UUID,
    coach: User = Depends(require_coach),
    conn: psycopg.Connection = Depends(get_conn),
) -> list[BlockOut]:
    """El historial de uno de mis atletas."""
    atleta = profiles.get_by_id(conn, athlete_id)
    if atleta is None or not access.es_su_atleta(coach, atleta):
        raise HTTPException(404, "Ese atleta no existe")
    return blocks.list_for_athlete(conn, athlete_id)


@app.get("/blocks/{block_id}", tags=["bloques"])
def obtener_bloque(
    block_id: int,
    usuario: User = Depends(get_current_user),
    conn: psycopg.Connection = Depends(get_conn),
) -> BlockOut:
    """Un bloque por su id."""
    return _bloque_visible(conn, block_id, usuario)


@app.post("/blocks", status_code=201, tags=["bloques"])
def crear_bloque(
    datos: BlockCreate,
    coach: User = Depends(require_coach),
    conn: psycopg.Connection = Depends(get_conn),
) -> BlockOut:
    """Crea un bloque en borrador para uno de mis atletas."""
    atleta = profiles.get_by_id(conn, datos.athlete_id)
    if atleta is None or not access.es_su_atleta(coach, atleta):
        raise HTTPException(403, "Ese atleta no esta a tu cargo")

    nuevo_id = blocks.create(conn, Block(
        id=0,
        name=datos.name,
        coach_id=coach.id,
        athlete_id=datos.athlete_id,
        total_weeks=datos.total_weeks,
        start_date=datos.start_date,
        status=BlockStatus.DRAFT,
        notes=datos.notes,
    ))
    return blocks.get_by_id(conn, nuevo_id)


@app.patch("/blocks/{block_id}/status", tags=["bloques"])
def cambiar_estado_bloque(
    block_id: int,
    datos: StatusUpdate,
    usuario: User = Depends(get_current_user),
    conn: psycopg.Connection = Depends(get_conn),
) -> BlockOut:
    _bloque_editable(conn, block_id, usuario)
    try:
        blocks.update_status(conn, block_id, datos.status)
    except psycopg.errors.UniqueViolation:
        raise HTTPException(
            409, "Este atleta ya tiene un bloque activo. Cierralo antes."
        )
    return blocks.get_by_id(conn, block_id)


# ---------------------------------------------------------------------
# Entrenos
# ---------------------------------------------------------------------


@app.get("/blocks/{block_id}/workouts", tags=["entrenos"])
def listar_entrenos(
    block_id: int,
    week: int | None = None,
    usuario: User = Depends(get_current_user),
    conn: psycopg.Connection = Depends(get_conn),
) -> list[WorkoutOut]:
    _bloque_visible(conn, block_id, usuario)
    if week is not None:
        return workouts.list_for_week(conn, block_id, week)
    return workouts.list_for_block(conn, block_id)


@app.post("/blocks/{block_id}/workouts", status_code=201,
          tags=["entrenos"])
def generar_sesiones(
    block_id: int,
    datos: WorkoutsGenerate,
    usuario: User = Depends(get_current_user),
    conn: psycopg.Connection = Depends(get_conn),
) -> list[WorkoutOut]:
    bloque = _bloque_editable(conn, block_id, usuario)
    try:
        sesiones = planning.generar_sesiones(
            bloque, datos.days, datos.names
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    workouts.create_many(conn, sesiones)
    return workouts.list_for_block(conn, block_id)


@app.get("/workouts/{workout_id}/exercises", tags=["entrenos"])
def listar_ejercicios(
    workout_id: int,
    usuario: User = Depends(get_current_user),
    conn: psycopg.Connection = Depends(get_conn),
) -> list[ExerciseOut]:
    """Los ejercicios de un entreno, en su orden."""
    entreno = workouts.get_by_id(conn, workout_id)
    if entreno is None:
        raise HTTPException(404, "Ese entreno no existe")
    _bloque_visible(conn, entreno.block_id, usuario)
    return exercises.list_for_workout(conn, workout_id)


@app.post("/workouts/{workout_id}/exercises", status_code=201,
          tags=["entrenos"])
def anadir_ejercicio(
    workout_id: int,
    datos: ExerciseCreate,
    usuario: User = Depends(get_current_user),
    conn: psycopg.Connection = Depends(get_conn),
) -> ExerciseOut:
    entreno = workouts.get_by_id(conn, workout_id)
    if entreno is None:
        raise HTTPException(404, "Ese entreno no existe")
    _bloque_editable(conn, entreno.block_id, usuario)

    posicion = datos.position
    if posicion is None:
        posicion = exercises.next_position(conn, workout_id)

    try:
        nuevo_id = exercises.add(conn, Exercise(
            id=0,
            workout_id=workout_id,
            definition_id=datos.definition_id,
            position=posicion,
            superset_group=datos.superset_group,
            notes=datos.notes,
        ))
    except psycopg.errors.UniqueViolation:
        raise HTTPException(409, f"La posicion {posicion} ya esta ocupada")
    except psycopg.errors.ForeignKeyViolation:
        raise HTTPException(400, "Ese ejercicio no esta en el catalogo")

    return [e for e in exercises.list_for_workout(conn, workout_id)
            if e.id == nuevo_id][0]


# ---------------------------------------------------------------------
# Catalogo
# ---------------------------------------------------------------------


@app.get("/exercise-definitions", tags=["catalogo"])
def buscar_ejercicios(
    q: str = "",
    muscle_group: str | None = None,
    usuario: User = Depends(get_current_user),
    conn: psycopg.Connection = Depends(get_conn),
) -> list[ExerciseDefinitionOut]:
    coach_id = (usuario.id if usuario.role.value == "coach"
                else usuario.coach_id)
    return defs.search(conn, coach_id, q, muscle_group)


# ---------------------------------------------------------------------
# Series
# ---------------------------------------------------------------------


@app.get("/workouts/{workout_id}/logs", tags=["series"])
def listar_series(
    workout_id: int,
    usuario: User = Depends(get_current_user),
    conn: psycopg.Connection = Depends(get_conn),
) -> list[SetLogOut]:
    entreno = workouts.get_by_id(conn, workout_id)
    if entreno is None:
        raise HTTPException(404, "Ese entreno no existe")
    _bloque_visible(conn, entreno.block_id, usuario)
    return set_logs.list_for_workout(conn, workout_id)


@app.put("/exercises/{exercise_id}/logs/{set_number}", tags=["series"])
def registrar_serie(
    exercise_id: int,
    set_number: int,
    datos: SetLogCreate,
    usuario: User = Depends(get_current_user),
    conn: psycopg.Connection = Depends(get_conn),
) -> SetLogOut:
    fila = conn.execute(
        "select w.block_id from exercises e "
        "join workouts w on w.id = e.workout_id "
        "where e.id = %s",
        (exercise_id,),
    ).fetchone()
    if fila is None:
        raise HTTPException(404, "Ese ejercicio no existe")

    bloque = _bloque_visible(conn, fila["block_id"], usuario)
    if not access.puede_registrar_en_bloque(usuario, bloque):
        raise HTTPException(
            403, "Solo el atleta del bloque registra sus series"
        )

    set_logs.upsert(conn, SetLog(
        id=0,
        exercise_id=exercise_id,
        set_number=set_number,
        reps=datos.reps,
        weight=datos.weight,
        rpe=datos.rpe,
        prescription_id=datos.prescription_id,
    ))
    return [s for s in set_logs.list_for_exercise(conn, exercise_id)
            if s.set_number == set_number][0]
