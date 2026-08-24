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


class Timing(BaseModel):
    start: str = Field(max_length=8)   # "HH:MM"
    end:   str = Field(max_length=8)


class Leave(BaseModel):
    date:   date
    reason: Optional[str] = Field(default="Leave", max_length=255)


class ScheduleSave(BaseModel):
    workingDays:  List[str]
    timings:      Timing
    breakTimings: Optional[Timing] = None
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
    def timings_sensible(self):
        s1s, s1e = _to_min(self.timings.start), _to_min(self.timings.end)
        if s1s is not None and s1e is not None and s1s >= s1e:
            raise ValueError("End time must be after start time")
        if self.breakTimings:
            s2s, s2e = _to_min(self.breakTimings.start), _to_min(self.breakTimings.end)
            if s2s is not None and s2e is not None:
                if s2s >= s2e:
                    raise ValueError("Break end time must be after break start time")
                if s1s is not None and s2s < s1s:
                    raise ValueError("Break must start after shift starts")
                if s1e is not None and s2e > s1e:
                    raise ValueError("Break must end before shift ends")
        return self
