from pydantic import BaseModel, Field, field_validator, model_validator
from typing import List, Optional
from datetime import date


def _to_min(t: str) -> Optional[int]:
    """'HH:MM' -> minutes since midnight, or None if blank/invalid."""
    if not t:
        return None
    try:
        h, m = t.split(":")[:2]
        return int(h) * 60 + int(m)
    except (ValueError, IndexError):
        return None


VALID_DAYS = {"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"}


class Session(BaseModel):
    start: str = Field(max_length=8)   # "HH:MM"
    end:   str = Field(max_length=8)


class Leave(BaseModel):
    date:   date
    reason: Optional[str] = Field(default="Leave", max_length=255)


class ScheduleSave(BaseModel):
    workingDays:  List[str]
    session1:     Session
    session2:     Optional[Session] = None
    slotDuration: int = 15
    maxPatients:  int = 30
    exceptions:   List[Leave] = []
    updatedBy:    Optional[str] = None

    @field_validator("workingDays")
    @classmethod
    def valid_days(cls, v: List[str]) -> List[str]:
        bad = [d for d in v if d not in VALID_DAYS]
        if bad:
            raise ValueError(f"Invalid working day(s): {', '.join(bad)}")
        # de-duplicate, preserve order
        seen, out = set(), []
        for d in v:
            if d not in seen:
                seen.add(d)
                out.append(d)
        return out

    @field_validator("slotDuration")
    @classmethod
    def slot_range(cls, v: int) -> int:
        if v < 5 or v > 240:
            raise ValueError("Slot duration must be between 5 and 240 minutes")
        return v

    @field_validator("maxPatients")
    @classmethod
    def patients_range(cls, v: int) -> int:
        if v < 1 or v > 500:
            raise ValueError("Max patients must be between 1 and 500")
        return v

    @model_validator(mode="after")
    def sessions_sensible(self):
        s1s, s1e = _to_min(self.session1.start), _to_min(self.session1.end)
        if s1s is not None and s1e is not None and s1s >= s1e:
            raise ValueError("Morning session end time must be after its start time")
        if self.session2:
            s2s, s2e = _to_min(self.session2.start), _to_min(self.session2.end)
            if s2s is not None and s2e is not None:
                if s2s >= s2e:
                    raise ValueError("Evening session end time must be after its start time")
                if s1e is not None and s2s < s1e:
                    raise ValueError("Evening session must start after the morning session ends")
        return self
