import datetime
import re
import unicodedata
from dataclasses import dataclass, field
from typing import Optional

DIAS_SEMANA = ["lunes", "martes", "miercoles", "jueves",
               "viernes", "sabado", "domingo"]

# La unica columna fija: la que dice "Dia N" en la cabecera y el tipo
# de movimiento (Push/Pull/Leg) en las filas de debajo.
COL_TIPO = 2

# Las demas se buscan por su nombre, porque el bloque 1 no tiene
# "Prioridad" y lleva todo corrido una columna.
ETIQUETAS = {
    "tipo ejercicio": "subtipo",
    "prioridad": "prioridad",
    "stress index": "stress_index",
    "ejercicio": "nombre",
    "protocolo": "protocolo",
    "notas": "notas",
}

# Lo que la base de datos acepta. Fuera de aqui es una errata del Excel.
RPE_MIN, RPE_MAX = 1.0, 10.0
PESO_MAX = 9999.99
REPS_MAX = 100

_HOJA = re.compile(r"^\s*(\d+|deload\s*\d*)\s*\((\d+)\)\s*$", re.I)
_DIA = re.compile(r"^d[ií]a\s*(\d+)$", re.I)


def _limpio(valor) -> str:
    return str(valor).strip() if valor is not None else ""


def _sin_tildes(texto: str) -> str:
    quitadas = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in quitadas if not unicodedata.combining(c)).lower()


def _numero(valor) -> Optional[float]:
    if valor is None:
        return None
    if isinstance(valor, (int, float)):
        return float(valor)
    texto = str(valor).strip().replace(",", ".")
    try:
        return float(texto)
    except ValueError:
        return None


@dataclass
class SerieLeida:
    numero: int
    peso: Optional[float]
    reps: Optional[int]
    rpe: Optional[float]


@dataclass
class EjercicioLeido:
    fila: int
    nombre: str
    tipo: Optional[str] = None
    subtipo: Optional[str] = None
    prioridad: Optional[str] = None
    stress_index: Optional[float] = None
    protocolo: Optional[str] = None
    notas: Optional[str] = None
    series: list[SerieLeida] = field(default_factory=list)


@dataclass
class DiaLeido:
    numero: int
    fila: int
    weekday: Optional[int] = None
    ejercicios: list[EjercicioLeido] = field(default_factory=list)


@dataclass
class SemanaLeida:
    numero: int
    hoja: str
    inicio: Optional[datetime.date] = None
    dias: list[DiaLeido] = field(default_factory=list)
    avisos: list[str] = field(default_factory=list)

    @property
    def series_totales(self) -> int:
        return sum(len(e.series) for d in self.dias for e in d.ejercicios)


def semanas_del_libro(libro) -> dict[str, list[tuple[int, str]]]:
    # {"3": [(1, "1 (3)"), (2, "2 (3)"), ...]}  ordenado por semana.
    bloques: dict[str, list[tuple[int, str]]] = {}
    deloads: dict[str, int] = {}
    for nombre in libro.sheetnames:
        casa = _HOJA.match(nombre)
        if casa is None:
            continue
        etiqueta, bloque = casa.group(1).strip(), casa.group(2)
        if etiqueta.lower().startswith("deload"):
            # Los deload no llevan numero de semana: van al final, en orden.
            deloads[bloque] = deloads.get(bloque, 0) + 1
            numero = 900 + deloads[bloque]
        else:
            numero = int(etiqueta)
        bloques.setdefault(bloque, []).append((numero, nombre))
    for semanas in bloques.values():
        semanas.sort()
    return bloques


def _buscar_inicio(hoja) -> Optional[datetime.date]:
    for fila in hoja.iter_rows(min_row=1, max_row=12, max_col=14):
        for celda in fila:
            if _sin_tildes(_limpio(celda.value)) == "inicio semana":
                for siguiente in hoja[celda.row][celda.column:]:
                    if isinstance(siguiente.value, datetime.datetime):
                        return siguiente.value.date()
                    if isinstance(siguiente.value, datetime.date):
                        return siguiente.value
    return None


def _mapa_de_dias(hoja) -> dict[int, int]:
    # Fila con los nombres de dia, y justo debajo "Dia 1", "Dia 2"...
    for fila in hoja.iter_rows(min_row=1, max_row=45, max_col=12):
        columnas = {
            DIAS_SEMANA.index(_sin_tildes(_limpio(c.value))): c.column
            for c in fila
            if _sin_tildes(_limpio(c.value)) in DIAS_SEMANA
        }
        if len(columnas) < 5:
            continue
        por_columna = {col: dia for dia, col in columnas.items()}
        mapa = {}
        for celda in hoja[fila[0].row + 1]:
            casa = _DIA.match(_limpio(celda.value))
            if casa and celda.column in por_columna:
                mapa[int(casa.group(1))] = por_columna[celda.column]
        if mapa:
            return mapa
    return {}


@dataclass
class Cabecera:
    fila: int
    dia: int
    campos: dict[str, int]
    series: list[tuple[int, int, int]]


def _leer_cabecera(hoja, fila: int) -> Optional[Cabecera]:
    casa = _DIA.match(_limpio(hoja.cell(row=fila, column=COL_TIPO).value))
    if casa is None:
        return None

    etiquetas = [
        (c.column, _sin_tildes(_limpio(c.value))) for c in hoja[fila]
    ]
    campos = {
        ETIQUETAS[texto]: col
        for col, texto in etiquetas
        if texto in ETIQUETAS and ETIQUETAS[texto] not in ()
    }
    if "nombre" not in campos:
        return None

    # Peso/Reps/RPE se repiten una vez por serie; la 1 lleva E1RM extra.
    por_columna = dict(etiquetas)
    series = []
    for col, texto in etiquetas:
        if texto != "peso":
            continue
        reps = rpe = None
        for salto in (1, 2):
            if por_columna.get(col + salto) == "reps":
                reps = col + salto
            if por_columna.get(col + salto) == "rpe":
                rpe = col + salto
        if reps is not None and rpe is not None:
            series.append((col, reps, rpe))
    return Cabecera(fila=fila, dia=int(casa.group(1)), campos=campos,
                    series=series)


def _leer_series(hoja, fila: int, cabecera: Cabecera) -> list[SerieLeida]:
    series = []
    for n, (c_peso, c_reps, c_rpe) in enumerate(cabecera.series, 1):
        peso = _numero(hoja.cell(row=fila, column=c_peso).value)
        reps = _numero(hoja.cell(row=fila, column=c_reps).value)
        rpe = _numero(hoja.cell(row=fila, column=c_rpe).value)
        # Sin repeticiones no hubo serie, por mucho peso que ponga.
        if reps is None or reps <= 0:
            continue
        series.append(SerieLeida(n, peso, int(reps), rpe))
    return series


def leer_semana(hoja, numero: int) -> SemanaLeida:
    semana = SemanaLeida(numero=numero, hoja=hoja.title)
    semana.inicio = _buscar_inicio(hoja)
    mapa = _mapa_de_dias(hoja)

    dia_actual: Optional[DiaLeido] = None
    cabecera: Optional[Cabecera] = None

    for fila in range(1, hoja.max_row + 1):
        nueva = _leer_cabecera(hoja, fila)
        if nueva is not None:
            cabecera = nueva
            dia_actual = DiaLeido(
                numero=nueva.dia, fila=fila, weekday=mapa.get(nueva.dia)
            )
            semana.dias.append(dia_actual)
            continue
        if dia_actual is None or cabecera is None:
            continue

        nombre = _limpio(hoja.cell(row=fila, column=cabecera.campos["nombre"]).value)
        if not nombre:
            continue

        def texto(campo: str) -> Optional[str]:
            col = cabecera.campos.get(campo)
            return (_limpio(hoja.cell(row=fila, column=col).value) or None) if col else None

        col_si = cabecera.campos.get("stress_index")
        dia_actual.ejercicios.append(EjercicioLeido(
            fila=fila,
            nombre=nombre,
            tipo=_limpio(hoja.cell(row=fila, column=COL_TIPO).value) or None,
            subtipo=texto("subtipo"),
            prioridad=texto("prioridad"),
            stress_index=_numero(hoja.cell(row=fila, column=col_si).value) if col_si else None,
            protocolo=texto("protocolo"),
            notas=texto("notas"),
            series=_leer_series(hoja, fila, cabecera),
        ))

    # Los dias 5 y 6 de la plantilla suelen quedar vacios.
    semana.dias = [d for d in semana.dias if d.ejercicios]
    _sanear(semana)

    for dia in semana.dias:
        if dia.weekday is None:
            semana.avisos.append(
                f"El dia {dia.numero} no dice a que dia de la semana cae"
            )
    return semana


def _sanear(semana: SemanaLeida) -> None:
    # Hay erratas: el peso escrito en la casilla del RPE, reps de 200...
    # Se anula el dato imposible y se avisa, nunca se adivina.
    for dia in semana.dias:
        for ejercicio in dia.ejercicios:
            buenas = []
            for serie in ejercicio.series:
                donde = f"{ejercicio.nombre} (fila {ejercicio.fila}), serie {serie.numero}"
                if not 1 <= serie.reps <= REPS_MAX:
                    semana.avisos.append(f"{donde}: {serie.reps} reps, serie descartada")
                    continue
                if serie.rpe is not None and not RPE_MIN <= serie.rpe <= RPE_MAX:
                    semana.avisos.append(f"{donde}: RPE {serie.rpe}, se deja sin RPE")
                    serie.rpe = None
                if serie.peso is not None and not 0 <= serie.peso <= PESO_MAX:
                    semana.avisos.append(f"{donde}: peso {serie.peso}, se deja sin peso")
                    serie.peso = None
                buenas.append(serie)
            ejercicio.series = buenas


def leer_bloque(libro, bloque: str) -> list[SemanaLeida]:
    semanas = semanas_del_libro(libro).get(bloque, [])
    leidas = []
    for orden, (_, nombre) in enumerate(semanas, 1):
        leidas.append(leer_semana(libro[nombre], orden))
    return leidas


def inicio_estimado(semanas: list[SemanaLeida]) -> Optional[datetime.date]:
    # Las fechas del Excel no son fiables: hay semanas sin tocar y saltos
    # hacia atras. Cada una propone un inicio (su fecha menos las semanas
    # que lleva) y se queda la propuesta que mas veces se repite.
    propuestas: dict[datetime.date, int] = {}
    for semana in semanas:
        if semana.inicio is None:
            continue
        candidato = semana.inicio - datetime.timedelta(weeks=semana.numero - 1)
        propuestas[candidato] = propuestas.get(candidato, 0) + 1
    if not propuestas:
        return None
    return max(propuestas.items(), key=lambda p: (p[1], -p[0].toordinal()))[0]


def nombres_del_bloque(semanas: list[SemanaLeida]) -> dict[str, dict]:
    # {nombre tal cual sale del Excel: {veces, tipos}}
    catalogo: dict[str, dict] = {}
    for semana in semanas:
        for dia in semana.dias:
            for ejercicio in dia.ejercicios:
                ficha = catalogo.setdefault(
                    ejercicio.nombre, {"veces": 0, "tipos": set()}
                )
                ficha["veces"] += 1
                if ejercicio.tipo:
                    ficha["tipos"].add(ejercicio.tipo)
    return catalogo


def clave(nombre: str) -> str:
    # Para detectar que "Curls" y "Curl de biceps" no son lo mismo pero
    # "Tr�ceps Extensions" y "Triceps Extensions" si.
    limpio = _sin_tildes(nombre).replace("-", " ")
    return " ".join(limpio.split())
