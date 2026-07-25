let currentPoints = [];
let markers = [];
let currentLine = null;
let savedRouteLine = null;

const map = L.map("map").setView([-23.5505, -46.6333], 13);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
  maxZoom: 19,
}).addTo(map);

map.on("click", (e) => {
  if (savedRouteLine) return;
  addPoint(e.latlng.lat, e.latlng.lng);
});

const statDistance = document.getElementById("stat-distance");
const statTime = document.getElementById("stat-time");
const statPoints = document.getElementById("stat-points");
const routeNameInput = document.getElementById("route-name");
const transportModeSelect = document.getElementById("transport-mode");
const btnSave = document.getElementById("btn-save");
const btnClear = document.getElementById("btn-clear");
const routeListEl = document.getElementById("route-list");

const TRANSPORT_SPEEDS_KMH = {
  walking: 5.0,
  running: 10.0,
  cycling: 16.0,
  driving: 30.0,
};

const TRANSPORT_LABELS = {
  walking: "🚶 Caminhada",
  running: "🏃 Corrida",
  cycling: "🚴 Bicicleta",
  driving: "🚗 Carro",
};

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "—";
  if (seconds < 60) return `${seconds} seg`;
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
}

function estimateDurationSeconds(distanceKm, mode) {
  const speed = TRANSPORT_SPEEDS_KMH[mode] || TRANSPORT_SPEEDS_KMH.walking;
  if (speed <= 0 || distanceKm <= 0) return 0;
  return Math.round((distanceKm / speed) * 3600);
}

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
  const mode = transportModeSelect.value;
  const duration = estimateDurationSeconds(dist, mode);

  statDistance.textContent = `${dist.toFixed(3)} km`;
  statTime.textContent = formatDuration(duration);
  statPoints.textContent = currentPoints.length;
  btnSave.disabled = currentPoints.length < 2;
}

transportModeSelect.addEventListener("change", updateStats);

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

btnSave.addEventListener("click", async () => {
  const name = routeNameInput.value.trim();
  if (!name) {
    alert("Dá um nome pra rota antes de salvar.");
    return;
  }
  if (currentPoints.length < 2) return;

  const payload = {
    name,
    transport_mode: transportModeSelect.value,
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
    const duration = formatDuration(r.duration_seconds);
    const modeLabel = TRANSPORT_LABELS[r.transport_mode] || "";
    li.innerHTML = `
      <div class="name">${r.name}</div>
      <div class="meta">${r.distance_km.toFixed(3)} km · ${duration} · ${modeLabel}</div>
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

async function viewRoute(id) {
  clearCurrentRoute();
  const resp = await fetch(`/api/routes/${id}`);
  const route = await resp.json();

  const latlngs = route.points.map((p) => [p.latitude, p.longitude]);
  savedRouteLine = L.polyline(latlngs, { color: "#f78c3c", weight: 4 }).addTo(map);
  map.fitBounds(savedRouteLine.getBounds(), { padding: [40, 40] });

  statDistance.textContent = `${route.distance_km.toFixed(3)} km`;
  statTime.textContent = formatDuration(route.duration_seconds);
  statPoints.textContent = route.points.length;
}

updateStats();
loadRoutes();
