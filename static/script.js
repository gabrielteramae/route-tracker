// ---- Estado ----
let currentPoints = []; // [{lat, lng}]
let markers = [];
let currentLine = null;
let savedRouteLine = null;

// ---- Mapa ----
const map = L.map("map").setView([-23.5505, -46.6333], 13); // São Paulo como centro inicial

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
  maxZoom: 19,
}).addTo(map);

map.on("click", (e) => {
  if (savedRouteLine) return; // não adiciona ponto se estiver visualizando rota salva
  addPoint(e.latlng.lat, e.latlng.lng);
});

// ---- Elementos ----
const statDistance = document.getElementById("stat-distance");
const statPoints = document.getElementById("stat-points");
const routeNameInput = document.getElementById("route-name");
const btnSave = document.getElementById("btn-save");
const btnClear = document.getElementById("btn-clear");
const routeListEl = document.getElementById("route-list");

// ---- Haversine (client-side, pra feedback em tempo real) ----
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function totalDistance(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineKm(
      points[i - 1].lat,
      points[i - 1].lng,
      points[i].lat,
      points[i].lng
    );
  }
  return total;
}

// ---- Adicionar ponto ----
function addPoint(lat, lng) {
  currentPoints.push({ lat, lng, recorded_at: new Date().toISOString() });

  const marker = L.circleMarker([lat, lng], {
    radius: 6,
    color: "#4dabf7",
    fillColor: "#4dabf7",
    fillOpacity: 1,
  }).addTo(map);
  markers.push(marker);

  redrawLine();
  updateStats();
}

function redrawLine() {
  if (currentLine) map.removeLayer(currentLine);
  if (currentPoints.length < 2) return;

  currentLine = L.polyline(
    currentPoints.map((p) => [p.lat, p.lng]),
    { color: "#4dabf7", weight: 4 }
  ).addTo(map);
}

function updateStats() {
  const dist = totalDistance(currentPoints);
  statDistance.textContent = `${dist.toFixed(3)} km`;
  statPoints.textContent = currentPoints.length;
  btnSave.disabled = currentPoints.length < 2;
}

// ---- Limpar ----
function clearCurrentRoute() {
  currentPoints = [];
  markers.forEach((m) => map.removeLayer(m));
  markers = [];
  if (currentLine) map.removeLayer(currentLine);
  currentLine = null;
  if (savedRouteLine) {
    map.removeLayer(savedRouteLine);
    savedRouteLine = null;
  }
  routeNameInput.value = "";
  updateStats();
}

btnClear.addEventListener("click", clearCurrentRoute);

// ---- Salvar rota ----
btnSave.addEventListener("click", async () => {
  const name = routeNameInput.value.trim();
  if (!name) {
    alert("Dá um nome pra rota antes de salvar.");
    return;
  }
  if (currentPoints.length < 2) return;

  const payload = {
    name,
    points: currentPoints.map((p) => ({
      latitude: p.lat,
      longitude: p.lng,
      recorded_at: p.recorded_at,
    })),
  };

  btnSave.disabled = true;
  try {
    const resp = await fetch("/api/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.detail || "Erro ao salvar rota");
    }
    clearCurrentRoute();
    await loadRoutes();
  } catch (e) {
    alert(e.message);
  } finally {
    btnSave.disabled = currentPoints.length < 2;
  }
});

// ---- Listar rotas salvas ----
async function loadRoutes() {
  const resp = await fetch("/api/routes");
  const routes = await resp.json();

  routeListEl.innerHTML = "";

  if (routes.length === 0) {
    routeListEl.innerHTML = '<li class="empty-state">Nenhuma rota salva ainda.</li>';
    return;
  }

  routes.forEach((r) => {
    const li = document.createElement("li");
    li.className = "route-item";
    const duration = r.duration_seconds
      ? `${Math.round(r.duration_seconds / 60)} min`
      : "—";
    li.innerHTML = `
      <div class="name">${r.name}</div>
      <div class="meta">${r.distance_km.toFixed(3)} km · ${r.point_count} pontos · ${duration}</div>
      <button class="delete-btn" title="Excluir">✕</button>
    `;
    li.addEventListener("click", (e) => {
      if (e.target.classList.contains("delete-btn")) return;
      viewRoute(r.id);
    });
    li.querySelector(".delete-btn").addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!confirm(`Excluir a rota "${r.name}"?`)) return;
      await fetch(`/api/routes/${r.id}`, { method: "DELETE" });
      await loadRoutes();
    });
    routeListEl.appendChild(li);
  });
}

// ---- Visualizar rota salva no mapa ----
async function viewRoute(id) {
  clearCurrentRoute();
  const resp = await fetch(`/api/routes/${id}`);
  const route = await resp.json();

  const latlngs = route.points.map((p) => [p.latitude, p.longitude]);
  savedRouteLine = L.polyline(latlngs, { color: "#f78c3c", weight: 4 }).addTo(map);
  map.fitBounds(savedRouteLine.getBounds(), { padding: [40, 40] });

  statDistance.textContent = `${route.distance_km.toFixed(3)} km`;
  statPoints.textContent = route.points.length;
}

// ---- Init ----
updateStats();
loadRoutes();
