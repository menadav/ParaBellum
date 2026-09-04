import datetime
import uuid
from dataclasses import dataclass
from typing import Optional


@dataclass
class SetPrescription:
    """Lo que el coach manda hacer en una serie."""

    id: int
    exercise_id: int
    set_number: int
    target_reps: int
    target_weight: Optional[float] = None
    target_rpe: Optional[float] = None


@dataclass
class SetLog:
    """Lo que el atleta registra que ha hecho realmente."""

    id: int
    exercise_id: int
    set_number: int
    reps: int
    weight: Optional[float] = None
    rpe: Optional[float] = None
    prescription_id: Optional[int] = None
    completed_at: Optional[datetime.datetime] = None
    # Quien la escribio. Si es el coach, esta pendiente de hacer.
    logged_by: Optional[uuid.UUID] = None

    @property
    def estimated_1rm(self) -> Optional[float]:
        """1RM estimado con la formula de Epley. None si no hubo peso."""
        if self.weight is None or self.reps < 1:
            return None
        return round(self.weight * (1 + self.reps / 30), 1)
