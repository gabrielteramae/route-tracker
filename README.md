# Route Tracker
![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.139-009688?style=flat&logo=fastapi&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat&logo=sqlite&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet.js-199900?style=flat&logo=leaflet&logoColor=white)

Aplicação Full-Stack para registrar rotas GPS num mapa interativo e calcular a distância percorrida - Um estudo sobre mapas, geolocalização e rotas

## Sobre

Você clica no mapa para marcar pontos de um trajeto, e a aplicação calcula em tempo real a distância percorrida usando a fórmula de Haversine (distância entre coordenadas geográficas). Ao salvar, a rota fica persistida e pode ser revisitada depois, com a linha do trajeto redesenhada no mapa.

O backend segue separação em camadas (models → schemas → API), com FastAPI servindo tanto a API REST quanto o frontend estático.

## Funcionalidades

- Marcar pontos de rota clicando no mapa (Leaflet.js)
- Cálculo de distância percorrida (Haversine) em tempo real, no cliente
- Cálculo de distância e duração persistido no backend ao salvar
- Salvar rota com nome
- Listar rotas salvas com resumo (distância, nº de pontos, duração)
- Visualizar uma rota salva redesenhada no mapa
- Excluir rota
- Validação de entrada (mínimo de 2 pontos, latitude/longitude dentro do intervalo válido)
- Documentação interativa da API via Swagger UI

## Stack

- **Backend:** Python 3.12, FastAPI, SQLAlchemy, Pydantic
- **Frontend:** HTML5, CSS3, JavaScript (Vanilla) + Leaflet.js (mapa) + OpenStreetMap (tiles)
- **Banco de dados:** SQLite

---

## Estrutura

```
route-tracker/
├── app/
│   ├── main.py          # rotas da API + serve o frontend estático
│   ├── models.py        # modelos SQLAlchemy (Route, Point)
│   ├── schemas.py        # schemas Pydantic (validação/serialização)
│   ├── database.py       # conexão com SQLite
│   └── geo.py            # cálculo de distância (Haversine) e duração
├── static/
│   ├── index.html
│   ├── style.css
│   └── script.js          # lógica do mapa + chamadas à API
├── requirements.txt
└── .gitignore
```

## Como rodar localmente

**Pré-requisitos:** Python 3.10+

```bash
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Acesse **http://localhost:8000** para a interface com o mapa, ou **http://localhost:8000/docs** para a documentação interativa (Swagger UI) da API.

## Endpoints da API

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/routes` | Cria uma rota a partir de uma lista de pontos |
| GET | `/api/routes` | Lista todas as rotas salvas (resumo) |
| GET | `/api/routes/{id}` | Detalhe de uma rota, com todos os pontos |
| DELETE | `/api/routes/{id}` | Exclui uma rota |

## Notas técnicas

A distância é calculada pela **fórmula de Haversine**, que estima a distância entre dois pontos na superfície de uma esfera a partir de suas coordenadas de latitude/longitude — aproximação adequada para rotas urbanas/regionais, com erro desprezível frente ao raio da Terra usado no cálculo.

O frontend calcula a distância no lado do cliente (JavaScript) para dar feedback visual imediato enquanto o usuário marca pontos, e o backend recalcula de forma independente ao salvar — garantindo que o valor persistido não dependa de confiar no cliente.
