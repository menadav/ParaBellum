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
    """Coach y atleta comparten tabla: un atleta apunta a su coach.

    Vive en la tabla 'profiles'. El id es el mismo uuid que Supabase Auth
    da al usuario en auth.users, y la contrasena no esta aqui: la guarda
    Supabase, nosotros no la vemos nunca.
    """

    id: uuid.UUID
    name: str
    email: str
    role: Role
    coach_id: Optional[uuid.UUID] = None
    status: AthleteStatus = AthleteStatus.PENDING
    weight_unit: WeightUnit = WeightUnit.KG
