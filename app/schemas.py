from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field

TransportMode = Literal["walking", "running", "cycling", "driving"]


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
    transport_mode: TransportMode = "walking"
    points: List[PointCreate] = Field(..., min_length=2)


class RouteSummary(BaseModel):
    id: int
    name: str
    distance_km: float
    duration_seconds: Optional[int] = None
    transport_mode: str
    created_at: datetime
    point_count: int

    class Config:
        from_attributes = True


class RouteDetail(BaseModel):
    id: int
    name: str
    distance_km: float
    duration_seconds: Optional[int] = None
    transport_mode: str
    created_at: datetime
    points: List[PointOut]

    class Config:
        from_attributes = True
