import datetime
import uuid
from dataclasses import dataclass
from typing import Optional


@dataclass
class Invitation:
    id: int
    token: str
    coach_id: uuid.UUID
    email: Optional[str] = None
    name: Optional[str] = None
    created_at: Optional[datetime.datetime] = None
    expires_at: Optional[datetime.datetime] = None
    accepted_at: Optional[datetime.datetime] = None
    accepted_by: Optional[uuid.UUID] = None

    @property
    def accepted(self) -> bool:
        return self.accepted_at is not None

    @property
    def expired(self) -> bool:
        if self.expires_at is None:
            return False
        return self.expires_at < datetime.datetime.now(datetime.timezone.utc)

    @property
    def usable(self) -> bool:
        # Lo unico que importa al abrir el enlace.
        return not self.accepted and not self.expired
