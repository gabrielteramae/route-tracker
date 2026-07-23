from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from .database import Base


class Route(Base):
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    distance_km = Column(Float, nullable=False, default=0.0)
    duration_seconds = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    points = relationship(
        "Point", back_populates="route", cascade="all, delete-orphan",
        order_by="Point.sequence",
    )


class Point(Base):
    __tablename__ = "points"

    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    sequence = Column(Integer, nullable=False)
    recorded_at = Column(DateTime, nullable=True)

    route = relationship("Route", back_populates="points")
