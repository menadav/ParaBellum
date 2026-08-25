import enum
from typing import Optional
import datetime

class Rool(enum.Enum):
    ATHLETE = "athlete"
    COACH = "coach"

class User:
    def __init__ (
            self,
            id: int,
            name: str,
            password: str,
            rool: Role,
            coach_id: Optional[int] = None,
            ) -> None:
        self.id = id
        self.name = name
        self.password = password
        self.rool = rool
        self.coach_id = coach_id

class Workout:
    def __init__(self, id: int,
                name: str,
                date: datetime.datetime,
                exercises,
                coach_id: int,
                athlete_id: int
            ) -> None:
        self.id = id
        self.name = name
        self.date = date
        self.exercises = exercises
        self.coach_id = coach_id
        self.athlete_id = athlete_id