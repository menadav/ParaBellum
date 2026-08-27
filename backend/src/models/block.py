import datetime
import enum
import uuid
from dataclasses import dataclass
from typing import Optional


class Weekday(enum.IntEnum):
    """Coincide con datetime.date.weekday(): lunes 0 ... domingo 6."""

    MONDAY = 0
    TUESDAY = 1
    WEDNESDAY = 2
    THURSDAY = 3
    FRIDAY = 4
    SATURDAY = 5
    SUNDAY = 6


class BlockStatus(str, enum.Enum):
    DRAFT = "draft"          # el coach lo esta montando, el atleta no lo ve
    ACTIVE = "active"
    COMPLETED = "completed"


@dataclass
class Block:
    """Bloque de entrenamiento de N semanas asignado a un atleta.

    Invariante: start_date debe ser el LUNES de la semana 1. El resto de
    fechas del bloque se calculan a partir de ella, nunca se guardan.
    """

    id: int
    name: str
    coach_id: uuid.UUID
    athlete_id: uuid.UUID
    total_weeks: int
    start_date: datetime.date
    status: BlockStatus = BlockStatus.DRAFT
    notes: Optional[str] = None

    @property
    def end_date(self) -> datetime.date:
        """Domingo de la ultima semana."""
        return self.start_date + datetime.timedelta(weeks=self.total_weeks, days=-1)

    def date_for(self, week_number: int, weekday: Weekday) -> datetime.date:
        """Fecha real de un entreno situado en (semana, dia de la semana)."""
        if not 1 <= week_number <= self.total_weeks:
            raise ValueError(
                f"week_number {week_number} fuera de rango 1..{self.total_weeks}"
            )
        return self.start_date + datetime.timedelta(
            weeks=week_number - 1, days=int(weekday)
        )

    def current_week(self, today: Optional[datetime.date] = None) -> int:
        """Semana en curso (1..total_weeks). 0 si el bloque aun no ha empezado."""
        today = today or datetime.date.today()
        if today < self.start_date:
            return 0
        return min((today - self.start_date).days // 7 + 1, self.total_weeks)
