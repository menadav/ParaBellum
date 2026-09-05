import datetime
import enum
import uuid
from dataclasses import dataclass
from typing import Optional


class NotificationKind(str, enum.Enum):
    INFO = "info"
    PAYMENT = "payment"
    WARNING = "warning"


@dataclass
class Notification:

    id: int
    coach_id: uuid.UUID
    athlete_id: uuid.UUID
    batch: uuid.UUID
    title: str
    kind: NotificationKind = NotificationKind.INFO
    body: Optional[str] = None
    created_at: Optional[datetime.datetime] = None
    read_at: Optional[datetime.datetime] = None
    expires_at: Optional[datetime.datetime] = None

    @property
    def read(self) -> bool:
        return self.read_at is not None

    def expired(self, ahora: Optional[datetime.datetime] = None) -> bool:
        if self.expires_at is None:
            return False
        ahora = ahora or datetime.datetime.now(datetime.timezone.utc)
        return self.expires_at <= ahora
