import datetime
import uuid
from dataclasses import dataclass, field
from difflib import SequenceMatcher
from typing import Optional

import psycopg

from models import Block, BlockStatus, Exercise, ExerciseDefinition, User
from models import Weekday, Workout, WorkoutStatus
from repositories import blocks, exercise_definitions as defs, exercises
from repositories import set_logs, workouts
from services import import_excel as lector

# Push/Pull/Leg/GPP del Excel -> muscle_group del catalogo.
GRUPOS = {
    "push": "Empuje",
    "pull": "Traccion",
    "leg": "Pierna",
    "gpp": "GPP",
    "core": "Core",
}

# Por encima de esto se propone juntar dos nombres. Es una propuesta, no
# una decision: "Abduccion" y "Aduccion" se parecen un 93% y son
# movimientos opuestos, asi que siempre lo confirma una persona.
PARECIDO_MINIMO = 0.86

HORA_POR_DEFECTO = datetime.time(19, 0)


@dataclass
class NombreLeido:
    nombre_excel: str
    veces: int
    tipo: Optional[str]
    sugerido: str
    grupo: Optional[str]
    ya_en_catalogo: bool = False


@dataclass
class BloqueLeido:
    numero: str
    semanas: int
    sesiones: int
    ejercicios: int
    series: int
    inicio: Optional[datetime.date]
    avisos: list[str] = field(default_factory=list)


@dataclass
class Resumen:
    block_id: int
    nombre: str
    semanas: int
    sesiones: int
    ejercicios: int
    series: int
    definiciones_nuevas: int
    inicio: datetime.date


def titulo(nombre: str) -> str:
    return " ".join(
        p if p.isupper() else p.capitalize() for p in nombre.split()
    )


def _parecido(a: str, b: str) -> float:
    return SequenceMatcher(None, lector.clave(a), lector.clave(b)).ratio()


def resumir_bloques(libro) -> list[BloqueLeido]:
    resumenes = []
    for numero in sorted(lector.semanas_del_libro(libro), key=int):
        semanas = lector.leer_bloque(libro, numero)
        resumenes.append(BloqueLeido(
            numero=numero,
            semanas=len(semanas),
            sesiones=sum(len(s.dias) for s in semanas),
            ejercicios=sum(
                len(d.ejercicios) for s in semanas for d in s.dias
            ),
            series=sum(s.series_totales for s in semanas),
            inicio=lector.inicio_estimado(semanas),
            avisos=[f"{s.hoja}: {a}" for s in semanas for a in s.avisos],
        ))
    return resumenes


def sugerir_nombres(
    semanas: list[lector.SemanaLeida],
    catalogo: Optional[list[ExerciseDefinition]] = None,
) -> list[NombreLeido]:
    encontrados = lector.nombres_del_bloque(semanas)
    ordenados = sorted(encontrados.items(), key=lambda x: -x[1]["veces"])
    ya_hay = {lector.clave(d.name) for d in (catalogo or [])}

    canonicos: list[str] = []
    salida = []
    for nombre, ficha in ordenados:
        gemelo = next(
            (c for c in canonicos if _parecido(nombre, c) >= PARECIDO_MINIMO),
            None,
        )
        if gemelo is None:
            canonicos.append(nombre)
        tipo = "/".join(sorted(ficha["tipos"])) or None
        salida.append(NombreLeido(
            nombre_excel=nombre,
            veces=ficha["veces"],
            tipo=tipo,
            sugerido=titulo(gemelo or nombre),
            grupo=GRUPOS.get((tipo or "").split("/")[0].lower()),
            ya_en_catalogo=lector.clave(nombre) in ya_hay,
        ))
    return salida


def escribir_bloque(
    conn: psycopg.Connection,
    semanas: list[lector.SemanaLeida],
    atleta: User,
    coach_id: uuid.UUID,
    mapa: dict[str, tuple[str, Optional[str]]],
    inicio: datetime.date,
    nombre_bloque: str,
) -> Resumen:
    faltan = {
        e.nombre
        for s in semanas
        for d in s.dias
        for e in d.ejercicios
        if e.nombre not in mapa
    }
    if faltan:
        raise ValueError(
            f"Faltan {len(faltan)} ejercicios por decidir: "
            + ", ".join(sorted(faltan)[:5])
        )

    # 1. Catalogo: una definicion por nombre final.
    existentes = {
        lector.clave(d.name): d.id
        for d in defs.search(conn, coach_id=coach_id)
    }
    ids_def: dict[str, int] = {}
    nuevas = 0
    for nombre_excel, (final, grupo) in mapa.items():
        llave = lector.clave(final)
        if llave not in existentes:
            existentes[llave] = defs.create(conn, ExerciseDefinition(
                id=0, name=final, explanation="Importado del Excel",
                coach_id=coach_id, muscle_group=grupo,
            ))
            nuevas += 1
        ids_def[nombre_excel] = existentes[llave]

    # 2. El bloque va como terminado: esto es historico.
    block_id = blocks.create(conn, Block(
        id=0, name=nombre_bloque, coach_id=coach_id,
        athlete_id=atleta.id, total_weeks=len(semanas),
        start_date=inicio, status=BlockStatus.COMPLETED,
        notes="Importado desde el Excel historico.",
    ))

    n_sesiones = n_ejercicios = n_series = 0
    for semana in semanas:
        for dia in semana.dias:
            workout_id = workouts.create(conn, Workout(
                id=0, block_id=block_id, name=f"Dia {dia.numero}",
                week_number=semana.numero,
                day_of_week=Weekday(dia.weekday),
                status=WorkoutStatus.COMPLETED,
            ))
            n_sesiones += 1
            fecha = inicio + datetime.timedelta(
                weeks=semana.numero - 1, days=dia.weekday
            )
            cuando = datetime.datetime.combine(fecha, HORA_POR_DEFECTO)

            for posicion, leido in enumerate(dia.ejercicios, 1):
                notas = " - ".join(
                    t for t in (leido.protocolo, leido.notas) if t
                ) or None
                exercise_id = exercises.add(conn, Exercise(
                    id=0, workout_id=workout_id,
                    definition_id=ids_def[leido.nombre],
                    position=posicion, notes=notas,
                ))
                n_ejercicios += 1
                if leido.series:
                    set_logs.import_many(conn, exercise_id, [
                        (s.numero, s.reps, s.peso, s.rpe, cuando)
                        for s in leido.series
                    ])
                    n_series += len(leido.series)

    return Resumen(
        block_id=block_id, nombre=nombre_bloque, semanas=len(semanas),
        sesiones=n_sesiones, ejercicios=n_ejercicios, series=n_series,
        definiciones_nuevas=nuevas, inicio=inicio,
    )
