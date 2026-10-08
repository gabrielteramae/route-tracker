# Route Tracker — distância por Haversine, tempo por velocidade média

![Python](https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.139.2-009688?logo=fastapi&logoColor=white)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0.51-D71F00)
![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-199900?logo=leaflet&logoColor=white)
![Pytest](https://img.shields.io/badge/pytest-8.4.2-0A9EDC?logo=pytest&logoColor=white)

Registra uma rota de pontos GPS, soma os trechos com Haversine (raio 6371 km) e estima a duração pela velocidade do modo de transporte. A página usa Leaflet e tiles do OpenStreetMap; o mapa abre em São Paulo (`-23.5505, -46.6333`). O tempo gravado não é o intervalo entre cliques.

## Por que estimar o tempo

| Fonte do tempo | O que mede |
| --- | --- |
| `estimate_duration_seconds` (o que o POST usa) | distância / velocidade média: caminhada 5, corrida 10, bicicleta 16, carro 30 km/h |
| `route_duration_seconds` (existe em `geo.py` e o POST não chama) | diferença entre o primeiro e o último `recorded_at` |
| relógio do clique no mapa | o intervalo em que a pessoa marcou pontos, não o deslocamento |

A estimativa ignora trânsito, semáforo e relevo. `recorded_at` é opcional e fica salvo no ponto, mas não entra na duração. O front repete Haversine e as mesmas velocidades só para o número na tela; o valor persistido é o do servidor.

SQLite está fixo em `sqlite:///./route_tracker.db`. Não há `DATABASE_URL`.

## Stack

- Python (sem versão pinada no repositório)
- FastAPI 0.139.2, Uvicorn 0.51.0, Pydantic 2.13.4, SQLAlchemy 2.0.51
- SQLite em arquivo
- Leaflet 1.9.4 e OpenStreetMap, carregados por CDN em `static/index.html`
- pytest 8.4.2 e httpx 0.28.1

## Estrutura

```
app/
├── main.py       # /api/routes e a página em /
├── geo.py        # Haversine, soma, estimativa
├── models.py     # Route e Point
├── schemas.py    # walking, running, cycling, driving; mínimo 2 pontos
└── database.py   # sqlite:///./route_tracker.db
static/
├── index.html
├── script.js     # prévia no cliente
└── style.css
tests/
└── test_rotas.py
requirements.txt
```

## Como rodar

Não há Dockerfile.

```bash
git clone https://github.com/gabrielteramae/route-tracker.git
cd route-tracker
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

A página fica em `http://127.0.0.1:8000/`.

## Endpoints

| Método | Rota | Resposta |
| --- | --- | --- |
| GET | `/` | `static/index.html` |
| POST | `/api/routes` | 201, rota com `distance_km` e `duration_seconds`. Corpo: `name`, `transport_mode`, `points` (pelo menos 2, lat/lon) |
| GET | `/api/routes` | resumo, mais recente primeiro, com `point_count` |
| GET | `/api/routes/{route_id}` | detalhe com pontos; 404 se não existe |
| DELETE | `/api/routes/{route_id}` | 204; apaga os pontos em cascata |

## Testes realizados

`tests/test_rotas.py` troca o banco por SQLite em memória (`StaticPool`) e usa `TestClient`.

- 1 grau de latitude no equador bate com `6371 * radianos(1)`, cerca de 111,195 km
- a distância da rota é a soma dos trechos, arredondada a 3 casas
- POST com dois pontos e modo `walking` grava essa distância e a duração estimada

Não cobre listagem, DELETE, 404 nem `route_duration_seconds`.

```bash
pytest
```

---

© 2026 Gabriel Teramae Chan
