"""
Funções de cálculo geoespacial.

A fórmula de Haversine calcula a distância entre dois pontos na superfície
de uma esfera a partir de suas coordenadas de latitude/longitude. É uma
aproximação (a Terra não é uma esfera perfeita), mas o erro é desprezível
para distâncias de rotas urbanas/regionais.
"""
import math
from typing import List, Optional

EARTH_RADIUS_KM = 6371.0


def haversine_distance_km(
    lat1: float, lon1: float, lat2: float, lon2: float
) -> float:
    """Distância em km entre dois pontos (lat/lon em graus decimais)."""
    lat1_rad, lon1_rad = math.radians(lat1), math.radians(lon1)
    lat2_rad, lon2_rad = math.radians(lat2), math.radians(lon2)

    delta_lat = lat2_rad - lat1_rad
    delta_lon = lon2_rad - lon1_rad

    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
    )
    c = 2 * math.asin(math.sqrt(a))

    return EARTH_RADIUS_KM * c


def total_route_distance_km(points: List[tuple]) -> float:
    """
    Soma a distância entre pontos consecutivos de uma rota.
    points: lista de tuplas (lat, lon) na ordem em que foram percorridos.
    """
    if len(points) < 2:
        return 0.0

    total = 0.0
    for (lat1, lon1), (lat2, lon2) in zip(points, points[1:]):
        total += haversine_distance_km(lat1, lon1, lat2, lon2)

    return round(total, 3)


def route_duration_seconds(timestamps: List[Optional[object]]) -> Optional[int]:
    """
    Duração da rota em segundos, baseada no primeiro e último timestamp
    informado. Retorna None se os timestamps não foram fornecidos.

    Nota: só é significativo se os pontos foram registrados em tempo real
    (ex: GPS ao vivo). Se os pontos foram marcados manualmente clicando
    no mapa, use estimate_duration_seconds() em vez desta função.
    """
    validos = [t for t in timestamps if t is not None]
    if len(validos) < 2:
        return None

    inicio, fim = min(validos), max(validos)
    return int((fim - inicio).total_seconds())


# Velocidade média por modo de transporte, em km/h.
# Valores aproximados de referência para ambiente urbano.
TRANSPORT_SPEEDS_KMH = {
    "walking": 5.0,
    "running": 10.0,
    "cycling": 16.0,
    "driving": 30.0,
}


def estimate_duration_seconds(distance_km: float, transport_mode: str) -> int:
    """
    Estima o tempo de percurso a partir da distância total e do modo de
    transporte, usando uma velocidade média de referência. É uma estimativa
    (não considera trânsito, semáforos, relevo, etc.), mas dá uma noção
    realista de tempo — diferente de medir o tempo entre cliques no mapa,
    que não representa deslocamento real nenhum.
    """
    speed_kmh = TRANSPORT_SPEEDS_KMH.get(transport_mode, TRANSPORT_SPEEDS_KMH["walking"])
    if speed_kmh <= 0 or distance_km <= 0:
        return 0
    hours = distance_km / speed_kmh
    return int(round(hours * 3600))
