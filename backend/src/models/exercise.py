import uuid
from dataclasses import dataclass
from typing import Optional


@dataclass
class ExerciseDefinition:

    id: int
    name: str
    explanation: str
    coach_id: Optional[uuid.UUID] = None  # None = catalogo global
    muscle_group: Optional[str] = None
    video_url: Optional[str] = None
    image_url: Optional[str] = None


@dataclass
class Exercise:

    id: int
    workout_id: int
    definition_id: int
    position: int
    superset_group: Optional[str] = None  # "A" -> se alterna con los demas "A"
    notes: Optional[str] = None
