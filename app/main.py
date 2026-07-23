from pathlib import Path
from typing import List

from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from . import geo, models, schemas
from .database import Base, SessionLocal, engine, get_db

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Route Tracker API",
    description="API para registrar rotas GPS e calcular distância/duração percorrida.",
    version="1.0.0",
)

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"


@app.post("/api/routes", response_model=schemas.RouteDetail, status_code=201)
def create_route(route_in: schemas.RouteCreate, db: Session = Depends(get_db)):
    coords = [(p.latitude, p.longitude) for p in route_in.points]
    distance_km = geo.total_route_distance_km(coords)
    duration = geo.route_duration_seconds([p.recorded_at for p in route_in.points])

    route = models.Route(
        name=route_in.name,
        distance_km=distance_km,
        duration_seconds=duration,
    )
    db.add(route)
    db.flush()  # garante route.id antes de criar os pontos

    for idx, p in enumerate(route_in.points):
        db.add(
            models.Point(
                route_id=route.id,
                latitude=p.latitude,
                longitude=p.longitude,
                sequence=idx,
                recorded_at=p.recorded_at,
            )
        )

    db.commit()
    db.refresh(route)
    return route


@app.get("/api/routes", response_model=List[schemas.RouteSummary])
def list_routes(db: Session = Depends(get_db)):
    routes = db.query(models.Route).order_by(models.Route.created_at.desc()).all()
    return [
        schemas.RouteSummary(
            id=r.id,
            name=r.name,
            distance_km=r.distance_km,
            duration_seconds=r.duration_seconds,
            created_at=r.created_at,
            point_count=len(r.points),
        )
        for r in routes
    ]


@app.get("/api/routes/{route_id}", response_model=schemas.RouteDetail)
def get_route(route_id: int, db: Session = Depends(get_db)):
    route = db.query(models.Route).filter(models.Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Rota não encontrada")
    return route


@app.delete("/api/routes/{route_id}", status_code=204)
def delete_route(route_id: int, db: Session = Depends(get_db)):
    route = db.query(models.Route).filter(models.Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Rota não encontrada")
    db.delete(route)
    db.commit()
    return None


# Frontend estático (index.html, style.css, script.js)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
def serve_index():
    return FileResponse(str(STATIC_DIR / "index.html"))
