import datetime
from dataclasses import dataclass
from typing import Optional


@dataclass
class Message:
    id: int
    sender_id: int
    receiver_id: int
    content: str
    created_at: datetime.datetime
    set_log_id: Optional[int] = None  # feedback sobre una serie concreta
    is_read: bool = False
