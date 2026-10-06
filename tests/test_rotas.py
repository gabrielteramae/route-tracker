import math

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.geo import estimate_duration_seconds, haversine_distance_km, total_route_distance_km
from app.main import app

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
Session = sessionmaker(bind=engine)
Base.metadata.create_all(bind=engine)


def override_get_db():
    db = Session()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

# 1 grau de latitude no equador, com o raio usado pelo projeto.
UM_GRAU_KM = round(6371.0 * math.radians(1), 3)


def test_um_grau_de_latitude_no_equador():
    distancia = haversine_distance_km(0, 0, 1, 0)
    assert round(distancia, 3) == UM_GRAU_KM
    assert abs(distancia - 111.195) < 0.01


def test_rota_soma_os_trechos():
    pontos = [(0, 0), (1, 0), (1, 1)]
    total = total_route_distance_km(pontos)
    esperado = round(
        haversine_distance_km(0, 0, 1, 0) + haversine_distance_km(1, 0, 1, 1),
        3,
    )
    assert total == esperado


def test_post_cria_rota_com_distancia_e_duracao():
    resposta = client.post(
        "/api/routes",
        json={
            "name": "Equador",
            "transport_mode": "walking",
            "points": [
                {"latitude": 0, "longitude": 0},
                {"latitude": 1, "longitude": 0},
            ],
        },
    )
    assert resposta.status_code == 201
    corpo = resposta.json()
    assert corpo["distance_km"] == UM_GRAU_KM
    assert corpo["duration_seconds"] == estimate_duration_seconds(UM_GRAU_KM, "walking")
    assert len(corpo["points"]) == 2
