import datetime
import enum
import uuid
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

    id: uuid.UUID
    name: str
    email: str
    role: Role
    coach_id: Optional[uuid.UUID] = None
    status: AthleteStatus = AthleteStatus.PENDING
    weight_unit: WeightUnit = WeightUnit.KG
    terms_version: Optional[str] = None
    terms_accepted_at: Optional[datetime.datetime] = None
    health_consent_at: Optional[datetime.datetime] = None

    @property
    def acepto_condiciones(self) -> bool:
        return self.terms_accepted_at is not None

    @property
    def acepto_datos_de_salud(self) -> bool:
        return self.health_consent_at is not None
