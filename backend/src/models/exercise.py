from dataclasses import dataclass
from typing import Optional


@dataclass
class ExerciseDefinition:
    """Ejercicio del catalogo, reutilizable entre entrenos y atletas."""

    id: int
    name: str
    explanation: str
    coach_id: Optional[int] = None  # None = catalogo global de la app
    muscle_group: Optional[str] = None
    video_url: Optional[str] = None
    image_url: Optional[str] = None


@dataclass
class Exercise:
    """Instancia del catalogo dentro de un entreno concreto."""

    id: int
    workout_id: int
    definition_id: int
    position: int
    superset_group: Optional[str] = None  # "A" -> se alterna con los demas "A"
    notes: Optional[str] = None
