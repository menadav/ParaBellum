
from models import Block, Weekday, Workout, WorkoutStatus


def generar_sesiones(
    block: Block,
    dias: list[Weekday],
    nombres: list[str] | None = None,
) -> list[Workout]:
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
