import argparse
import csv
import datetime
import pathlib
import sys
from difflib import SequenceMatcher
from typing import Optional

RAIZ = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ / "src"))

from dotenv import load_dotenv

load_dotenv(RAIZ / ".env")

from openpyxl import load_workbook

import db
from models import Block, BlockStatus, Exercise, ExerciseDefinition, Weekday
from models import Workout, WorkoutStatus
from repositories import blocks, exercise_definitions as defs, exercises
from repositories import profiles, set_logs, workouts
from services import import_excel as imp

CABECERA = ["nombre_excel", "veces", "tipo", "nombre_final", "grupo"]

# Push/Pull/Leg/GPP del Excel -> muscle_group del catalogo.
GRUPOS = {
    "push": "Empuje",
    "pull": "Traccion",
    "leg": "Pierna",
    "gpp": "GPP",
    "core": "Core",
}

PARECIDO_MINIMO = 0.86


def _titulo(nombre: str) -> str:
    return " ".join(
        p if p.isupper() else p.capitalize() for p in nombre.split()
    )


def _parecido(a: str, b: str) -> float:
    return SequenceMatcher(None, imp.clave(a), imp.clave(b)).ratio()


def sacar_nombres(libro, bloque: str, destino: pathlib.Path) -> None:
    if bloque == "todos":
        semanas = [
            w
            for b in imp.semanas_del_libro(libro)
            for w in imp.leer_bloque(libro, b)
        ]
    else:
        semanas = imp.leer_bloque(libro, bloque)

    catalogo = imp.nombres_del_bloque(semanas)
    ordenados = sorted(catalogo.items(), key=lambda x: -x[1]["veces"])

    # Los que se parecen mucho se agrupan bajo el mas usado.
    canonicos: list[str] = []
    propuesta: dict[str, str] = {}
    for nombre, _ficha in ordenados:
        gemelo = next(
            (c for c in canonicos if _parecido(nombre, c) >= PARECIDO_MINIMO),
            None,
        )
        propuesta[nombre] = gemelo or nombre
        if gemelo is None:
            canonicos.append(nombre)

    with destino.open("w", newline="", encoding="utf-8-sig") as f:
        escritor = csv.writer(f, delimiter=";")
        escritor.writerow(CABECERA)
        for nombre, ficha in ordenados:
            tipo = "/".join(sorted(ficha["tipos"]))
            grupo = GRUPOS.get(tipo.split("/")[0].lower(), "")
            escritor.writerow(
                [nombre, ficha["veces"], tipo, _titulo(propuesta[nombre]), grupo]
            )

    fusiones = sum(1 for n, p in propuesta.items() if n != p)
    print(f"{len(catalogo)} nombres distintos -> {destino}")
    print(
        f"{len(canonicos)} despues de juntar los parecidos "
        f"({fusiones} fusiones propuestas)"
    )


def _leer_mapa(origen: pathlib.Path) -> dict[str, tuple[str, Optional[str]]]:
    with origen.open(encoding="utf-8-sig") as f:
        return {
            fila["nombre_excel"]: (
                fila["nombre_final"].strip(),
                fila["grupo"].strip() or None,
            )
            for fila in csv.DictReader(f, delimiter=";")
        }


def importar(
    libro,
    bloque: str,
    atleta_email: str,
    mapa_csv: pathlib.Path,
    inicio: Optional[datetime.date],
    en_serio: bool,
) -> None:
    semanas = imp.leer_bloque(libro, bloque)
    if not semanas:
        raise SystemExit(f"El bloque {bloque} no tiene semanas")

    arranque = inicio or imp.inicio_estimado(semanas)
    if arranque is None:
        raise SystemExit("Ese bloque no trae fechas: pasa --inicio AAAA-MM-DD")

    avisos = [f"{w.hoja}: {a}" for w in semanas for a in w.avisos]
    if avisos:
        print(f"{len(avisos)} avisos al leer el Excel:")
        for aviso in avisos:
            print(f"   {aviso}")
        print()

    mapa = _leer_mapa(mapa_csv)
    faltan = {
        e.nombre
        for w in semanas
        for d in w.dias
        for e in d.ejercicios
        if e.nombre not in mapa
    }
    if faltan:
        raise SystemExit(
            f"{len(faltan)} ejercicios no estan en {mapa_csv.name}: "
            + ", ".join(sorted(faltan)[:5])
        )

    with db.transaction() as conn:
        atleta = profiles.get_by_email(conn, atleta_email)
        if atleta is None:
            raise SystemExit(f"No hay ningun perfil con el correo {atleta_email}")
        coach_id = atleta.coach_id or atleta.id

        # 1. Catalogo: una definicion por nombre final.
        existentes = {
            imp.clave(d.name): d.id
            for d in defs.search(conn, coach_id=coach_id)
        }
        ids_def: dict[str, int] = {}
        nuevas = 0
        for nombre_excel, (final, grupo) in mapa.items():
            llave = imp.clave(final)
            if llave not in existentes:
                existentes[llave] = defs.create(
                    conn,
                    ExerciseDefinition(
                        id=0,
                        name=final,
                        explanation="Importado del Excel",
                        coach_id=coach_id,
                        muscle_group=grupo,
                    ),
                )
                nuevas += 1
            ids_def[nombre_excel] = existentes[llave]

        # 2. El bloque va como terminado: esto es historico.
        bloque_id = blocks.create(
            conn,
            Block(
                id=0,
                name=f"Bloque {bloque} (Excel)",
                coach_id=coach_id,
                athlete_id=atleta.id,
                total_weeks=len(semanas),
                start_date=arranque,
                status=BlockStatus.COMPLETED,
                notes="Importado desde el Excel historico.",
            ),
        )

        n_sesiones = n_ejercicios = n_series = 0
        for semana in semanas:
            for dia in semana.dias:
                workout_id = workouts.create(
                    conn,
                    Workout(
                        id=0,
                        block_id=bloque_id,
                        name=f"Dia {dia.numero}",
                        week_number=semana.numero,
                        day_of_week=Weekday(dia.weekday),
                        status=WorkoutStatus.COMPLETED,
                    ),
                )
                n_sesiones += 1
                fecha = arranque + datetime.timedelta(
                    weeks=semana.numero - 1, days=dia.weekday
                )
                cuando = datetime.datetime.combine(fecha, datetime.time(19, 0))

                for posicion, leido in enumerate(dia.ejercicios, 1):
                    notas = (
                        " - ".join(
                            t for t in (leido.protocolo, leido.notas) if t
                        )
                        or None
                    )
                    ejercicio_id = exercises.add(
                        conn,
                        Exercise(
                            id=0,
                            workout_id=workout_id,
                            definition_id=ids_def[leido.nombre],
                            position=posicion,
                            notes=notas,
                        ),
                    )
                    n_ejercicios += 1
                    if leido.series:
                        set_logs.import_many(
                            conn,
                            ejercicio_id,
                            [
                                (s.numero, s.reps, s.peso, s.rpe, cuando)
                                for s in leido.series
                            ],
                        )
                        n_series += len(leido.series)

        print(
            f"bloque {bloque}: {len(semanas)} semanas - {n_sesiones} sesiones - "
            f"{n_ejercicios} ejercicios - {n_series} series"
        )
        print(f"catalogo: {nuevas} definiciones nuevas")
        print(f"inicio: {arranque}   atleta: {atleta.name}")
        if not en_serio:
            conn.rollback()
            print("\nPRUEBA: no se ha guardado nada. Repite con --en-serio")


def main() -> None:
    p = argparse.ArgumentParser(description="Mete bloques del Excel en la BD")
    p.add_argument("--excel", default="David Mena.xlsx")
    p.add_argument("--bloque", required=True, help="numero de bloque, o todos")
    p.add_argument(
        "--nombres",
        metavar="CSV",
        help="solo saca la lista de ejercicios a este fichero",
    )
    p.add_argument("--mapa", metavar="CSV", help="el CSV ya revisado por ti")
    p.add_argument("--atleta", help="correo del atleta")
    p.add_argument("--inicio", help="AAAA-MM-DD, si el Excel no trae fechas")
    p.add_argument(
        "--en-serio",
        action="store_true",
        help="sin esto es una prueba y no guarda nada",
    )
    args = p.parse_args()

    libro = load_workbook(args.excel, data_only=True)
    if args.nombres:
        sacar_nombres(libro, args.bloque, pathlib.Path(args.nombres))
        return
    if not (args.mapa and args.atleta):
        raise SystemExit("Para importar hacen falta --mapa y --atleta")
    importar(
        libro,
        args.bloque,
        args.atleta,
        pathlib.Path(args.mapa),
        datetime.date.fromisoformat(args.inicio) if args.inicio else None,
        args.en_serio,
    )


if __name__ == "__main__":
    main()
