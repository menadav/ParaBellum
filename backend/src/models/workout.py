import datetime
import enum
from dataclasses import dataclass
from typing import Optional

from .block import Weekday


class WorkoutStatus(str, enum.Enum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"


@dataclass
class Workout:

    id: int
    block_id: int
    name: str
    week_number: int
    day_of_week: Weekday
    status: WorkoutStatus = WorkoutStatus.PLANNED
    completed_at: Optional[datetime.datetime] = None
    athlete_notes: Optional[str] = None
