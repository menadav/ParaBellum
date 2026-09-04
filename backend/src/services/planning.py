"""Servicios de planificacion: las reglas de montar un bloque.

Tu PRIMERA funcion de la capa de servicios.

Fijate en lo que NO hay en este fichero: ni una linea de SQL, ni una
conexion, ni un nombre de tabla. Solo objetos del dominio.

Y fijate en lo que SI hay: una decision. "Un bloque de 12 semanas con
3 dias tiene 36 sesiones, y se llaman asi". Eso no es guardar datos,
es saber como funciona el entrenamiento. Por eso no cabe en un
repositorio.
"""

from models import Block, Weekday, Workout, WorkoutStatus


def generar_sesiones(
    block: Block,
    dias: list[Weekday],
    nombres: list[str] | None = None,
) -> list[Workout]:
    """Monta las sesiones de un bloque entero, sin guardarlas.

    Un bloque de 12 semanas entrenando lunes, miercoles y viernes son
    36 sesiones. Esta funcion las construye; guardarlas es trabajo de
    workouts.create_many().

    Que devuelva la lista en vez de guardarla tiene premio: la puedes
    probar sin base de datos, y el coach podria ver una vista previa
    antes de confirmar.

    nombres: uno por dia de entrenamiento ("Push", "Pierna", "Pull").
    Si no se dan, se numeran.
    """
    if not dias:
        raise ValueError("Un bloque necesita al menos un dia de entreno")

    if len(set(dias)) != len(dias):
        raise ValueError("Hay dias repetidos en la semana")

    if nombres is None:
        nombres = [f"Dia {i}" for i in range(1, len(dias) + 1)]

    if len(nombres) != len(dias):
        raise ValueError(
            f"Hay {len(dias)} dias pero {len(nombres)} nombres"
        )

    return [
        Workout(
            id=0,
            block_id=block.id,
            name=nombres[i],
            week_number=semana,
            day_of_week=dia,
            status=WorkoutStatus.PLANNED,
        )
        for semana in range(1, block.total_weeks + 1)
        for i, dia in enumerate(dias)
    ]
