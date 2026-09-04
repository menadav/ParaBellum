import datetime
import enum
import uuid
from dataclasses import dataclass
from typing import Optional


class Gender(str, enum.Enum):
    FEMALE = "female"
    MALE = "male"
    OTHER = "other"


@dataclass
class AthleteProfile:
    """Ficha del atleta: lo que el coach recoge al darlo de alta.

    coach_note es privada: el atleta no la ve nunca.
    """

    athlete_id: uuid.UUID
    birth_date: Optional[datetime.date] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    gender: Optional[Gender] = None
    height_cm: Optional[float] = None
    occupation: Optional[str] = None
    training_since: Optional[str] = None
    sports: Optional[str] = None
    injuries: Optional[str] = None
    nutrition: Optional[str] = None
    goals: Optional[str] = None
    priorities: Optional[str] = None
    best_squat: Optional[float] = None
    best_bench: Optional[float] = None
    best_deadlift: Optional[float] = None
    coach_note: Optional[str] = None

    @property
    def age(self) -> Optional[int]:
        """Edad en anos cumplidos."""
        if self.birth_date is None:
            return None
        hoy = datetime.date.today()
        return (
            hoy.year - self.birth_date.year
            - ((hoy.month, hoy.day) < (self.birth_date.month, self.birth_date.day))
        )

    @property
    def total(self) -> Optional[float]:
        """Suma de las tres marcas. None si falta alguna."""
        marcas = (self.best_squat, self.best_bench, self.best_deadlift)
        return round(sum(marcas), 1) if all(m is not None for m in marcas) else None
