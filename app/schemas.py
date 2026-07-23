from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class PointCreate(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    recorded_at: Optional[datetime] = None


class PointOut(BaseModel):
    id: int
    latitude: float
    longitude: float
    sequence: int
    recorded_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RouteCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    points: List[PointCreate] = Field(..., min_length=2)


class RouteSummary(BaseModel):
    id: int
    name: str
    distance_km: float
    duration_seconds: Optional[int] = None
    created_at: datetime
    point_count: int

    class Config:
        from_attributes = True


class RouteDetail(BaseModel):
    id: int
    name: str
    distance_km: float
    duration_seconds: Optional[int] = None
    created_at: datetime
    points: List[PointOut]

    class Config:
        from_attributes = True
