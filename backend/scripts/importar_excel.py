import argparse
import csv
import datetime
import pathlib
import sys
from typing import Optional

RAIZ = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ / "src"))

from dotenv import load_dotenv

load_dotenv(RAIZ / ".env")

from openpyxl import load_workbook

import db
from repositories import profiles
from services import import_excel as lector
from services import importador

CABECERA = ["nombre_excel", "veces", "tipo", "nombre_final", "grupo"]


def sacar_nombres(libro, bloque: str, destino: pathlib.Path) -> None:
    if bloque == "todos":
        semanas = [
            s
            for b in lector.semanas_del_libro(libro)
            for s in lector.leer_bloque(libro, b)
        ]
    else:
        semanas = lector.leer_bloque(libro, bloque)

    nombres = importador.sugerir_nombres(semanas)
    with destino.open("w", newline="", encoding="utf-8-sig") as f:
        escritor = csv.writer(f, delimiter=";")
        escritor.writerow(CABECERA)
        for n in nombres:
            escritor.writerow([
                n.nombre_excel, n.veces, n.tipo or "", n.sugerido,
                n.grupo or "",
            ])

    distintos = len({n.sugerido for n in nombres})
    fusiones = sum(
        1 for n in nombres if n.sugerido.lower() != n.nombre_excel.lower()
    )
    print(f"{len(nombres)} nombres distintos -> {destino}")
    print(
        f"{distintos} despues de juntar los parecidos "
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
    semanas = lector.leer_bloque(libro, bloque)
    if not semanas:
        raise SystemExit(f"El bloque {bloque} no tiene semanas")

    arranque = inicio or lector.inicio_estimado(semanas)
    if arranque is None:
        raise SystemExit("Ese bloque no trae fechas: pasa --inicio AAAA-MM-DD")

    avisos = [f"{s.hoja}: {a}" for s in semanas for a in s.avisos]
    if avisos:
        print(f"{len(avisos)} avisos al leer el Excel:")
        for aviso in avisos:
            print(f"   {aviso}")
        print()

    with db.transaction() as conn:
        atleta = profiles.get_by_email(conn, atleta_email)
        if atleta is None:
            raise SystemExit(
                f"No hay ningun perfil con el correo {atleta_email}"
            )

        try:
            resumen = importador.escribir_bloque(
                conn,
                semanas,
                atleta,
                atleta.coach_id or atleta.id,
                _leer_mapa(mapa_csv),
                arranque,
                f"Bloque {bloque} (Excel)",
            )
        except ValueError as fallo:
            raise SystemExit(str(fallo))

        print(
            f"bloque {bloque}: {resumen.semanas} semanas - "
            f"{resumen.sesiones} sesiones - {resumen.ejercicios} ejercicios - "
            f"{resumen.series} series"
        )
        print(f"catalogo: {resumen.definiciones_nuevas} definiciones nuevas")
        print(f"inicio: {resumen.inicio}   atleta: {atleta.name}")
        if not en_serio:
            conn.rollback()
            print('\nPRUEBA: no se ha guardado nada. Repite con --en-serio')


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
