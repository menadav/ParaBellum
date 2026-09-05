import uuid
from dataclasses import dataclass, field

import psycopg

from models import Block, Exercise, SetLog, Workout, WorkoutStatus
from repositories import exercises, set_logs, workouts


@dataclass
class ResumenRepetir:
    origen: int
    copiadas: list[int] = field(default_factory=list)
    saltadas: list[int] = field(default_factory=list)
    sesiones: int = 0
    ejercicios: int = 0
    series: int = 0


def semanas_ocupadas(conn: psycopg.Connection, block_id: int) -> set[int]:
    filas = conn.execute(
        "select distinct week_number from workouts where block_id = %s",
        (block_id,),
    ).fetchall()
    return {fila["week_number"] for fila in filas}


def repetir_semana(
    conn: psycopg.Connection,
    bloque: Block,
    origen: int,
    destinos: list[int],
    reemplazar: bool = False,
) -> ResumenRepetir:
    if not 1 <= origen <= bloque.total_weeks:
        raise ValueError(f"La semana {origen} no esta en el bloque")

    plantilla = workouts.list_for_week(conn, bloque.id, origen)
    if not plantilla:
        raise ValueError(f"La semana {origen} esta vacia, no hay nada que copiar")

    resumen = ResumenRepetir(origen=origen)
    ocupadas = semanas_ocupadas(conn, bloque.id)

    for destino in sorted(set(destinos)):
        if destino == origen:
            continue
        if not 1 <= destino <= bloque.total_weeks:
            raise ValueError(f"La semana {destino} no esta en el bloque")

        if destino in ocupadas:
            if not reemplazar:
                resumen.saltadas.append(destino)
                continue
            for vieja in workouts.list_for_week(conn, bloque.id, destino):
                workouts.delete(conn, vieja.id)

        _copiar(conn, bloque, plantilla, destino, resumen)
        resumen.copiadas.append(destino)

    return resumen


def _copiar(
    conn: psycopg.Connection,
    bloque: Block,
    plantilla: list[Workout],
    destino: int,
    resumen: ResumenRepetir,
) -> None:
    for sesion in plantilla:
        nuevo_id = workouts.create(conn, Workout(
            id=0,
            block_id=bloque.id,
            name=sesion.name,
            week_number=destino,
            day_of_week=sesion.day_of_week,
            status=WorkoutStatus.PLANNED,
        ))
        resumen.sesiones += 1

        pendientes = _pendientes_por_ejercicio(conn, sesion.id, bloque.coach_id)
        for ejercicio in exercises.list_for_workout(conn, sesion.id):
            copia_id = exercises.add(conn, Exercise(
                id=0,
                workout_id=nuevo_id,
                definition_id=ejercicio.definition_id,
                position=ejercicio.position,
                superset_group=ejercicio.superset_group,
                notes=ejercicio.notes,
            ))
            resumen.ejercicios += 1

            for serie in pendientes.get(ejercicio.id, []):
                set_logs.upsert(conn, SetLog(
                    id=0,
                    exercise_id=copia_id,
                    set_number=serie.set_number,
                    reps=serie.reps,
                    weight=serie.weight,
                    rpe=serie.rpe,
                    logged_by=bloque.coach_id,
                ))
                resumen.series += 1


def _pendientes_por_ejercicio(
    conn: psycopg.Connection, workout_id: int, coach_id: uuid.UUID
) -> dict[int, list[SetLog]]:
    # Solo lo que escribio el coach. Las marcas del atleta son un
    # resultado suyo, no una plantilla: copiarlas a la semana que viene
    # seria darle por hecho un entreno que todavia no ha hecho.
    pendientes: dict[int, list[SetLog]] = {}
    for serie in set_logs.list_for_workout(conn, workout_id):
        if serie.logged_by == coach_id:
            pendientes.setdefault(serie.exercise_id, []).append(serie)
    return pendientes
