import enum
from dataclasses import dataclass
from typing import Optional


class Role(str, enum.Enum):
    ATHLETE = "athlete"
    COACH = "coach"


class AthleteStatus(str, enum.Enum):
    PENDING = "pending"    # invitado por el coach, todavia no ha aceptado
    ACTIVE = "active"
    INACTIVE = "inactive"  # dado de baja, se conserva su historico


class WeightUnit(str, enum.Enum):
    KG = "kg"
    LB = "lb"


@dataclass
class User:
    """Coach y atleta comparten tabla: un atleta apunta a su coach con coach_id."""

    id: int
    name: str
    email: str
    password_hash: str
    role: Role
    coach_id: Optional[int] = None
    status: AthleteStatus = AthleteStatus.PENDING
    weight_unit: WeightUnit = WeightUnit.KG
